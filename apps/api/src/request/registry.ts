/**
 * Registry of every Tank.Request URL (docs/spec/request/00-endpoints.md, 123 .ashx). Matching is case-insensitive.
 * - ported: src/request/endpoints/*.ts
 * - template builders (55): generated from src/templates/defs.ts; the .ashx itself rebuilds (admin only), the client
 *   downloads <file>.xml (served by routes/request.ts from TemplateCache)
 * - stubs: valid `<Result value="false" message="Not supported"/>` with the compression the client loader expects,
 *   so screens degrade gracefully (see README "Endpoint status").
 */
import Login from "./endpoints/Login.js";
import LoginSelectList from "./endpoints/LoginSelectList.js";
import NickNameCheck from "./endpoints/NickNameCheck.js";
import ServerList from "./endpoints/ServerList.js";
import VisualizeRegister from "./endpoints/VisualizeRegister.js";
import CreateLogin from "./endpoints/CreateLogin.js";
import * as social from "./endpoints/social.js";
import { stub, type Endpoint } from "./types.js";

/** Client calls these with COMPRESS_REQUEST_LOADER (inflate). Everything else is plain. */
const ZLIB_STUBS = ["/UserQuestList.ashx", "/CheckRegistration.ashx"];

/** Known endpoints not ported yet (or broken in DDTank41, spec §3.2). */
const STUBS = [
  "/AccountRegister.ashx", "/ActivePullDown.ashx", "/AdvanceQuestTime.ashx", "/API/Login.ashx", "/API/Register.ashx",
  "/ApprenticeshipClubList.ashx", "/AuctionPageList.ashx", "/CelebList/UserRankDate.ashx", "/UserRankDate.ashx",
  "/ChargeTest.ashx", "/CheckRegistration.ashx", "/ConsortiaAllyList.ashx", "/ConsortiaApplyAllyList.ashx",
  "/ConsortiaApplyUsersList.ashx", "/ConsortiaDutyList.ashx", "/ConsortiaEquipControl.ashx", "/ConsortiaEquipControlList.ashx",
  "/ConsortiaEventList.ashx", "/ConsortiaIMList.ashx", "/ConsortiaInviteUsersList.ashx", "/CreatShortCut.ashx",
  "/ExitGameTransit.ashx", "/FarmGetUserFieldInfos.ashx", "/FarmGetUserFieldInfosSingle.ashx",
  "/FavoriteTransit.ashx", "/GetSID.ashx", "/GiftRecieveLog.ashx", "/giftsendlog.ashx", "/giftsendlog1.ashx",
  "/gmtipallbyids.ashx", "/IMFriendsBbs.ashx", "/IMFriendsGood.ashx", "/IMRecentContactsList.ashx", "/KeyGenerator.ashx",
  "/LoadUserEquip.ashx", "/LoadUserItems.ashx", "/LoadUsersSort.ashx", "/LogTime.ashx", "/luckstaractivityrank.ashx",
  "/MapWeekList.ashx", "/MarryInfoPageList.ashx", "/PayTransit.ashx", "/RenameConsortiaName.ashx", "/RenameNick.ashx",
  "/SentReward.ashx", "/shopcheapitemlist2.ashx", "/UserGoodsInfo.ashx", "/UserQuestList.ashx", "/VisualizeItemLoad.ashx",
  "/CelebList/celebbyweekleaguescore.ashx",
  // requested by the client, no handler in DDTank41 either
  "/AdvanceQuestion.ashx", "/AdvanceQuestionAppraisal.ashx", "/AdvanceReply.ashx", "/ChargeMoneyForTest.ashx",
  "/CommitWeeklyUserRecord.ashx", "/ConsortiaCandidateList.ashx", "/GetWorldWealth.ashx", "/LogClickTip.ashx",
  "/LogInviteFriends.ashx", "/QueryWealthDivineNum.ashx", "/SameCityIMLoad.ashx", "/SendActiveKeySystem.ashx",
  "/SendMailGameUrl.ashx", "/UserGetActiveState.ashx", "/VoteSubmit.ashx", "/VoteSubmitResult.ashx",
];

const PORTED: Endpoint[] = [
  Login,
  LoginSelectList,
  ServerList,
  VisualizeRegister,
  NickNameCheck,
  CreateLogin,
  social.IMListLoad,
  social.UserApprenticeshipInfoList,
  social.ConsortiaList,
  social.ConsortiaUsersList,
  social.ConsortiaNameCheck,
  social.AdvanceQuestionRead,
  social.shopcheapitemlist,
  social.LoadUserMail,
  social.MailSenderList,
  social.DailyLogList,
];

export const ENDPOINTS = new Map<string, Endpoint>();
for (const e of PORTED) ENDPOINTS.set(e.path.toLowerCase(), e);
for (const s of STUBS) if (!ENDPOINTS.has(s.toLowerCase())) ENDPOINTS.set(s.toLowerCase(), stub(s, { zlib: ZLIB_STUBS.some((z) => z.toLowerCase() === s.toLowerCase()) }));

export const endpointStatus = () => ({
  ported: PORTED.map((e) => e.path),
  stubs: STUBS.filter((s) => !PORTED.some((p) => p.path.toLowerCase() === s.toLowerCase())),
});
