import { randomBytes } from 'crypto'

import { getMatrixConfig } from './config'
import { MatrixApiError, matrixFetch } from './http'

export type MatrixSession = {
  accessToken: string
  userId: string
}

/**
 * Ensure a Matrix user exists on the homeserver, creating it through the
 * Synapse admin API if needed (port of tese-backend ensureMatrixUser).
 * Returns the matrix user id for chaining.
 */
export const ensureMatrixUser = async (
  matrixUserId: string,
  displayName: string
): Promise<string> => {
  const { baseUrl, adminToken } = getMatrixConfig()
  const userPath = `/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`

  try {
    await matrixFetch('GET', baseUrl, userPath, { token: adminToken })
    return matrixUserId
  } catch (error) {
    if (!(error instanceof MatrixApiError) || error.status !== 404) {
      throw error
    }
  }

  await matrixFetch('PUT', baseUrl, userPath, {
    token: adminToken,
    body: {
      password: randomBytes(24).toString('base64'),
      displayname: displayName,
      admin: false,
      deactivated: false,
    },
  })

  return matrixUserId
}

/**
 * Mint a client access token for a user via the Synapse admin login API,
 * falling back to admin-created access tokens (port of tese-backend
 * loginAsUser, without the temp-password fallback).
 */
export const loginAsMatrixUser = async (
  matrixUserId: string
): Promise<MatrixSession> => {
  const { baseUrl, adminToken } = getMatrixConfig()

  try {
    const login = await matrixFetch<{ access_token: string }>(
      'POST',
      baseUrl,
      `/_synapse/admin/v1/users/${encodeURIComponent(matrixUserId)}/login`,
      { token: adminToken, body: {} }
    )
    return { accessToken: login.access_token, userId: matrixUserId }
  } catch (loginError) {
    const tokens = await matrixFetch<{ access_token: string }>(
      'POST',
      baseUrl,
      `/_synapse/admin/v1/users/${encodeURIComponent(matrixUserId)}/access_tokens`,
      { token: adminToken, body: {} }
    ).catch(() => {
      throw loginError
    })
    return { accessToken: tokens.access_token, userId: matrixUserId }
  }
}

/** Resolve a room alias to a room id, or null if the alias doesn't exist. */
const resolveAlias = async (aliasLocalpart: string): Promise<string | null> => {
  const { baseUrl, serverName, adminToken } = getMatrixConfig()
  const alias = `#${aliasLocalpart}:${serverName}`

  try {
    const dir = await matrixFetch<{ room_id?: string }>(
      'GET',
      baseUrl,
      `/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`,
      { token: adminToken }
    )
    return dir.room_id || null
  } catch (error) {
    if (error instanceof MatrixApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Join a user to a room with their own session (idempotent — joining an
 * already-joined room is a no-op). A private-room join needs a pending
 * invite; if it's missing (e.g. the user left earlier), `inviter` — who has
 * full power in trusted_private_chat rooms — re-invites and the join is
 * retried. The Synapse admin force-join API is NOT used: it requires the
 * admin account itself to be a room member.
 */
export const joinRoomAsUser = async (
  roomId: string,
  matrixUserId: string,
  inviter?: string
): Promise<void> => {
  const { baseUrl } = getMatrixConfig()
  const { accessToken } = await loginAsMatrixUser(matrixUserId)
  const joinPath = `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`

  try {
    await matrixFetch('POST', baseUrl, joinPath, { token: accessToken, body: {} })
  } catch (error) {
    const forbidden =
      error instanceof MatrixApiError && error.status === 403 && inviter
    if (!forbidden) {
      throw error
    }
    const inviterSession = await loginAsMatrixUser(inviter!)
    await matrixFetch(
      'POST',
      baseUrl,
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`,
      { token: inviterSession.accessToken, body: { user_id: matrixUserId } }
    )
    await matrixFetch('POST', baseUrl, joinPath, { token: accessToken, body: {} })
  }
}

export type EnsureRoomInput = {
  aliasLocalpart: string
  name: string
  creator: string
  /** All non-creator members; force-joined so the room lands in their inbox. */
  members: string[]
  /**
   * Commercial context the room is about (product/order). Stored as the
   * io.tese.room.context state event so chat UIs can show a deal panel.
   */
  context?: { product_id?: string; context_id?: string }
}

const ROOM_CONTEXT_EVENT_TYPE = 'io.tese.room.context'

/**
 * Get-or-create a private room with a deterministic alias. Idempotent: an
 * existing alias resolves to the existing room; creation races fall back to
 * resolution. All participants are (force-)joined on every call so a member
 * who left is brought back — mirrors TalkJS getOrCreateConversation.
 */
export const ensureRoom = async ({
  aliasLocalpart,
  name,
  creator,
  members,
  context,
}: EnsureRoomInput): Promise<{ roomId: string; alias: string }> => {
  const { baseUrl, serverName } = getMatrixConfig()
  const alias = `#${aliasLocalpart}:${serverName}`

  let roomId = await resolveAlias(aliasLocalpart)
  let justCreated = false

  if (!roomId) {
    const { accessToken } = await loginAsMatrixUser(creator)
    try {
      const created = await matrixFetch<{ room_id: string }>(
        'POST',
        baseUrl,
        '/_matrix/client/v3/createRoom',
        {
          token: accessToken,
          body: {
            is_direct: false,
            invite: members,
            name,
            preset: 'trusted_private_chat',
            visibility: 'private',
            room_alias_name: aliasLocalpart,
            ...(context
              ? {
                  initial_state: [
                    {
                      type: ROOM_CONTEXT_EVENT_TYPE,
                      state_key: '',
                      content: context,
                    },
                  ],
                }
              : {}),
          },
        }
      )
      roomId = created.room_id
      justCreated = true
    } catch (error) {
      // M_ROOM_IN_USE / 400 / 409: someone else created it between resolve
      // and create — resolve again.
      if (
        error instanceof MatrixApiError &&
        [400, 409].includes(error.status)
      ) {
        roomId = await resolveAlias(aliasLocalpart)
      }
      if (!roomId) {
        throw error
      }
    }
  }

  for (const member of members) {
    await joinRoomAsUser(roomId, member, creator)
  }
  // For a pre-existing room the creator may have left; any member can
  // re-invite (trusted_private_chat grants all members full power).
  await joinRoomAsUser(roomId, creator, members[0]).catch(() => {
    // Non-fatal: the other members are joined and can still message.
  })

  // Backfill the deal context onto rooms created before this feature.
  if (context && !justCreated) {
    try {
      const { accessToken } = await loginAsMatrixUser(creator)
      await matrixFetch(
        'PUT',
        baseUrl,
        `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/${ROOM_CONTEXT_EVENT_TYPE}/`,
        { token: accessToken, body: context }
      )
    } catch {
      // Non-fatal: the chat works without the deal panel context.
    }
  }

  return { roomId, alias }
}
