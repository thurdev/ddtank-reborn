/**
 * Registry of every Tank.Request URL (docs/spec/request/00-endpoints.md, 123 .ashx). Matching is case-insensitive.
 * - ported: src/request/endpoints/*.ts
 * - template builders (55): generated from src/templates/defs.ts; the .ashx itself rebuilds (admin only), the client
 *   downloads <file>.xml (served by routes/request.ts from TemplateCache)
 * - stubs: valid `<Result value="false" message="Not supported"/>` with the compression the client loader expects,
 *   so screens degrade gracefully (see README "Endpoint status").
 */
import * as events from "./endpoints/events.js";
import Login from "./endpoints/Login.js";
import LoginSelectList from "./endpoints/LoginSelectList.js";
import NickNameCheck from "./endpoints/NickNameCheck.js";
import ServerList from "./endpoints/ServerList.js";
import VisualizeRegister from "./endpoints/VisualizeRegister.js";
import CreateLogin from "./endpoints/CreateLogin.js";
import * as social from "./endpoints/social.js";
import * as consortia from "./endpoints/consortia.js";
import * as m3 from "./endpoints/m3.js";
import { stub, type Endpoint } from "./types.js";

/** Client calls these with COMPRESS_REQUEST_LOADER (inflate). Everything else is plain. */
const ZLIB_STUBS = ["/UserQuestList.ashx", "/CheckRegistration.ashx"];

/** Known endpoints not ported yet (or broken in DDTank41, spec §3.2). */
const STUBS = [
  "/AccountRegister.ashx", "/API/Login.ashx", "/API/Register.ashx",
  "/AuctionPageList.ashx",
  "/ChargeTest.ashx", "/CheckRegistration.ashx",
  "/CreatShortCut.ashx",
  "/ExitGameTransit.ashx", "/FarmGetUserFieldInfos.ashx", "/FarmGetUserFieldInfosSingle.ashx",
  "/FavoriteTransit.ashx", "/GetSID.ashx", "/GiftRecieveLog.ashx", "/giftsendlog.ashx", "/giftsendlog1.ashx",
  "/gmtipallbyids.ashx", "/IMFriendsBbs.ashx", "/IMFriendsGood.ashx", "/IMRecentContactsList.ashx", "/KeyGenerator.ashx",
  "/LoadUserEquip.ashx", "/LoadUserItems.ashx", "/LoadUsersSort.ashx", "/luckstaractivityrank.ashx",
  "/MapWeekList.ashx", "/PayTransit.ashx", "/RenameConsortiaName.ashx", "/RenameNick.ashx",
  "/SentReward.ashx", "/shopcheapitemlist2.ashx", "/UserGoodsInfo.ashx", "/UserQuestList.ashx", "/VisualizeItemLoad.ashx",
  "/CelebList/celebbyweekleaguescore.ashx",
  // requested by the client, no handler in DDTank41 either
  "/AdvanceQuestion.ashx", "/AdvanceQuestionAppraisal.ashx", "/AdvanceReply.ashx", "/ChargeMoneyForTest.ashx",
  "/CommitWeeklyUserRecord.ashx", "/ConsortiaCandidateList.ashx", "/GetWorldWealth.ashx", "/LogClickTip.ashx",
  "/LogInviteFriends.ashx", "/QueryWealthDivineNum.ashx", "/SameCityIMLoad.ashx", "/SendActiveKeySystem.ashx",
  "/SendMailGameUrl.ashx", "/UserGetActiveState.ashx", "/VoteSubmitResult.ashx",
  // DDT-6600 only, no C# handler found anywhere in the vendor dump (research/6600/ashx-missing.md P2 "no source"):
  // kept as a graceful stub rather than guessed logic. GetFightReport/DragonBoatFriendInfos/RecordSysInfo/
  // RecordUserVersion/ResetPassword4399/ProxyVIP/LoginRemoveSmallAccount/ConsortiaMatchHistory already fall back
  // to the zlib-empty-Result path via COMPRESS_ASHX_6600 (GetFightReport) or the generic unknown-endpoint path
  // (the rest; none of them are in COMPRESS_ASHX_6600 so they don't need the zlib wrapper here).
];

const PORTED: Endpoint[] = [
  Login,
  LoginSelectList,
  ServerList,
  VisualizeRegister,
  NickNameCheck,
  CreateLogin,
  social.IMListLoad,
  social.MarryInfoPageList,
  social.UserApprenticeshipInfoList,
  social.UserRankDate,
  social.ApprenticeshipClubList,
  social.ConsortiaList,
  social.ConsortiaUsersList,
  social.ConsortiaNameCheck,
  ...Object.values(consortia),
  social.AdvanceQuestionRead,
  social.shopcheapitemlist,
  social.LoadUserMail,
  social.MailSenderList,
  social.DailyLogList,
  events.ActivePullDown,
  m3.SceneCollecRandomNpc,
  m3.SubActiveList,
  m3.UpdateVersion,
  m3.VoteSubmit,
  m3.LogTime,
  m3.AdvanceQuestTime,
  m3.TeamBuyActiveAwardInfo,
  m3.ConsortiaWarConsortiaRank,
  m3.ConsortiaWarPlayerRank,
];

export const ENDPOINTS = new Map<string, Endpoint>();
for (const e of PORTED) ENDPOINTS.set(e.path.toLowerCase(), e);
for (const s of STUBS) if (!ENDPOINTS.has(s.toLowerCase())) ENDPOINTS.set(s.toLowerCase(), stub(s, { zlib: ZLIB_STUBS.some((z) => z.toLowerCase() === s.toLowerCase()) }));

export const endpointStatus = () => ({
  ported: PORTED.map((e) => e.path),
  stubs: STUBS.filter((s) => !PORTED.some((p) => p.path.toLowerCase() === s.toLowerCase())),
});
