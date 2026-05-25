import type { SocialAccount } from "@prisma/client";
import { publishToAccount } from "@/libs/publishers";

export const publishSocialPost = async (account: SocialAccount, content: string) => {
    return publishToAccount(account, content);
};
