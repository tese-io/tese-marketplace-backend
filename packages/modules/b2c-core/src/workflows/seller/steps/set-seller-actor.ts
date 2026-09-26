import { Modules } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

import {
  planSellerActor,
  revertSellerActor,
} from "../../../utils/seller-actor-metadata";

type SetSellerActorInput = {
  authIdentityId: string;
  memberId: string;
};

type SetSellerActorCompensation = {
  id: string;
  oldValue: string | null;
} | null;

/**
 * Points an auth identity at a seller member, overwriting any previous
 * value. Medusa's own `setAuthAppMetadataStep` throws when the key already
 * exists, which makes it unusable on a sign-in path that runs on every
 * login and must also survive a vendor moving between stores.
 *
 * A no-op when the identity already points at this member, so re-login
 * costs one read and writes nothing.
 */
export const setSellerActorStep = createStep(
  "set-seller-actor",
  async (
    data: SetSellerActorInput,
    { container }
  ): Promise<StepResponse<{ changed: boolean }, SetSellerActorCompensation>> => {
    const service = container.resolve(Modules.AUTH);
    const authIdentity = await service.retrieveAuthIdentity(data.authIdentityId);

    const plan = planSellerActor(authIdentity.app_metadata, data.memberId);
    if (!plan.changed) {
      return new StepResponse({ changed: false }, null);
    }

    await service.updateAuthIdentities({
      id: authIdentity.id,
      app_metadata: plan.appMetadata,
    });

    return new StepResponse({ changed: true }, {
      id: authIdentity.id,
      oldValue: plan.oldValue,
    });
  },
  async (compensation: SetSellerActorCompensation, { container }) => {
    if (!compensation) {
      return;
    }
    const service = container.resolve(Modules.AUTH);
    const authIdentity = await service.retrieveAuthIdentity(compensation.id);
    await service.updateAuthIdentities({
      id: authIdentity.id,
      app_metadata: revertSellerActor(
        authIdentity.app_metadata,
        compensation.oldValue
      ),
    });
  }
);
