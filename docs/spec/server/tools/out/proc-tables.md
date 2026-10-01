| Proc | DB | Tables referenced (best effort) | Declared params |
|---|---|---|---|
| `Mem_ActiveCode_Check` | Db_Membership | Mem_ActiveŃode | ActiveCode, Ouototal |
| `Mem_ActiveCode_Get` | Db_Membership | Mem_Application, Mem_ActiveCode | ApplicationName, ActiveCode, ApplicationId |
| `Mem_ActiveCode_Lost` | Db_Membership | Mem_ActiveCode | ActiveCode |
| `Mem_Application_Search` | Db_Membership | Mem_Application |  |
| `Mem_Application_Sub_Search` | Db_Membership | Mem_Application_Sub | Applicationɉd |
| `Mem_Code_Order_Sto` | Db_Membership | Mem_Code, Mem_CoŤe | Code, ouototal, orderidcard, temp |
| `Mem_Code_Sto` | Db_Membership | Mem_Code | code, ouototal, oldid |
| `Mem_NotUserRightɟList` | Db_Membership | Mem_Application, Mem_Right, Mem_UserRight | ApplicationName, UserId, ApplicationId |
| `Mem_ResetPwd_Chang` | Db_Membership | Mem_ResetPwd, Mem_Users | Result, UserName, TEMPCOUNT |
| `Mem_ResetPwd_SendMail` | Db_Membership | Mem_Application, Mem_ResetPwd | ApplicationName, UserName, ApplicationId, UserID |
| `Mem_Right_List` | Db_Membership | Mem_Application, Mem_Right | ApplicationName, ModuleId, ApplicationId |
| `Mem_Roles_List` | Db_Membership | Mem_Application, Mem_Roles | ApplicationName, ApplicationId |
| `Mem_UserInfo_AddPasswordWay` | Db_Membership | Mem_Application, Mem_UserInfo, Mem_Users | ApplicationName, UserName, PasswordFormat, PasswordSalt, ApplicationId |
| `Mem_UserInfo_SearchMail` | Db_Membership | Mem_UserInfo | USERID, MAILCOUNT |
| `Mem_UserInfo_SearchNameč` | Db_Membership | Mem_Users, Mem_Application, Mem_UserInfo | UserName, UserCOUNT, EMAIL, ApplicationName, Total, ApplicationId, UserId |
| `Mem_UserIŮfo_UserSex` | Db_Membership | Mem_Application, Mem_Users, Mem_UserInfo | ApplicationName, UserName, UserSex, Applicationŉd, UserId |
| `Mem_UserOne` | Db_Membership | Mem_Application, Mem_Users, Mem_UsersInRoles, Mem_Roles | ApplicationName, UserId, ApplicatɩonId |
| `Mem_UserRight_Check` | Db_Membership | Mem_Application, Mem_UserRight | ApplicationŎame, UserId, RightsId, ouototal, ApplicationId |
| `Mem_UserRight_Save` | Db_Membership | Mem_Application, Mem_UserRight | ApplicationName, UserŉD, RightsId, op, ouototal, ApplicationId |
| `Mem_Users_CreateUser` | Db_Membership | Mem_Application_User, Mem_Applicštion | ApplicationName, UserName, password, email, PasswordFormat, PasswordSalt, UserSex, UserId, LastActivityDate, Count, ApplicationId |
| `Mem_Users_Delete` | Db_Membership | Mem_Application, Mem_UserInfo, Mem_Users, Mem_UserRight | ApplicationName, UserId, ApplicationId |
| `Pay_Card_Lost` | Db_Membership | Pay_Card | OrderId, CardId, CardPassword, ApplicationId, ouototal |
| `SP_AccumulAtiveLoginAward_All` | Game34 | Login_Award_Item_Template |  |
| `SP_Achievement_All` | Game34 | Achievement |  |
| `SP_Achievement_Condition_All` | Game34 | AchievementCondition |  |
| `SP_Achievement_Data_All` | Player34 | AchievementData | UserID |
| `SP_Achievement_Reward_All` | Game34 | Achievement_Goods |  |
| `SP_Active_All` | Game34 | Active |  |
| `SP_Active_Convert_Item_Info_Single` | Game34 | Active_Convert_Item | ID |
| `SP_Active_PullDown` | Player34 | Project_Game34, Active_Number, Sys_Users_Detail | ActiveID, AwardID, UserID, StartDate, EndDate, HasKey, PullDown, Mark, CanGet |
| `SP_Active_Single` | Game34 | Active | ID |
| `SP_ActivitySystemItem_All` | Game34 | Activity_System_Item, Quest_Goods | LuckCompose, IsCount, IsBind, setUpdate, count2 |
| `SP_Admin_Redeem` | Player34 | Sys_Users_Goods, Sys_Users_Detail |  |
| `SP_Admin_SendAllItem` | Player34 | Sys_Users_Detail | Title, Content, UserID, Gold, Money, GiftToken, Param, NickName, temp, maxCount, ItemID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, SenderID, Sender, ReceiverID, Receiver, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Remark, Annex3, Annex4, Annex5, AnnexIndex |
| `SP_Admin_SendAllItem_UserID` | Player34 | Sys_Users_Detail | Title, Content, UserID, Gold, Money, GiftToken, ParamHole, Param, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6, NickName, temp, maxCount, ItemID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, SenderID, Sender, ReceiverID, Receiver, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Remark |
| `SP_Admin_SendAllItem_UserName` | Player34 | Sys_Users_Detail | Title, Content, UserName, Gold, Money, GiftToken, ParamHole, Param, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6, NickName, UserID, temp, maxCount, ItemID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, SenderID, Sender, ReceiverID, Receiver, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1 |
| `SP_Admin_SendAllItem_UserName_MultiSupport` | Player34 | Sys_Users_Detail | Title, Content, UserName, Gold, Money, GiftToken, ParamHole, Param, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6, NickName, UserID, temp, maxCount, ItemID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, SenderID, Sender, ReceiverID, Receiver, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1 |
| `SP_Admin_SendUserItem` | Player34 | Sys_Users_Detail, Shop_Goods, Sys_Users_Goods, User_Messages | ItemID, UserID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, ID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, temp, maxCount, NickName, Remark, getCount |
| `SP_Admin_SendUserMoney` | Player34 | Sys_Users_Detail, User_Messages | ID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist, NickName, Remark |
| `SP_AdoptPet_By_Id` | Player34 | AdoptPetList | ID |
| `SP_ASSInfo_Add` | Player34 | AASInfo | UserID, Name, IDNumber, State, Count |
| `SP_ASSInfo_All` | Player34 | AASInfo |  |
| `SP_ASSInfo_Single` | Player34 | AASInfo | UserID |
| `SP_Auction_Add` | Player34 | Auction | AuctionID, AuctioneerID, AuctioneerName, BeginDate, BuyerID, BuyerName, IsExist, ItemID, Mouthful, PayType, Price, Rise, ValidDate, TemplateID, Name, Category, Random, goodsCount |
| `SP_Auction_Delete` | Player34 | Auction, User_Messages, Consortia_Event | AuctionID, UserID, AuctioneerID, AuctioneerName, BuyerID, BuyerName, ItemID, PayType, Price, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, Remark |
| `SP_Auction_Scan` | Player34 | Server_Config, Auction, User_Messages | NoticeUserID, Cess, AuctionID, AuctioneerID, AuctioneerName, BuyerID, BuyerName, ItemID, PayType, Price, Name, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, Remark, Type, flat, NewPrice |
| `SP_Auction_Single` | Player34 | Auction | AuctionID |
| `SP_Auction_Update` | Player34 | Server_Config, Auction, User_Messages | AuctionID, AuctioneerID, AuctioneerName, BeginDate, BuyerID, BuyerName, IsExist, ItemID, Mouthful, PayType, Price, Rise, ValidDate, Name, Category, Cess, OldBuyerID, OldBuyerName, OldPrice, flat, NewPrice, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, Remark |
| `SP_Ball_All` | Game34 | Ball |  |
| `SP_Ball_Config_All` | Game34 | BallConfig |  |
| `SP_Category_Name_Single` | Game34 | Shop_Goods_Categorys | ID |
| `SP_Charge_Money_Add` | Player34 | Sys_Users_Detail, Rename_Nick, Charge_Money | ChargeID, UserName, Money, Date, PayWay, NeedMoney, UserID, IP, NickName, count |
| `SP_Charge_Record` | Player34 | V_Charge_Money | Date, Second |
| `SP_Charge_To_User` | Player34 | Charge_Money, Sys_Users_Detail | UserName, money, NickName |
| `SP_Clear_AdoptPet` | Player34 | AdoptPetList | ID |
| `SP_ClearAllMarryInfo` | Player34 | sys_users_detail |  |
| `SP_ClearMarryInfo` | Player34 | sys_users_detail | name |
| `SP_CommunalActiveAward_All` | Game34 | Communal_Active_Award |  |
| `SP_CommunalActiveExp_All` | Game34 | Communal_Active_Exp |  |
| `SP_Consortia_Add` | Player34 | Consortia, Consortia_Users, Consortia_Duty, Consortia_Ally, Sys_Users_Detail | ConsortiaID, BuildDate, CelebCount, ChairmanID, ChairmanName, ConsortiaName, CreatorID, CreatorName, Description, Honor, IP, IsExist, Level, MaxCount, Placard, Port, Repute, Count, Riches, tempDutyLevel, tempDutyName, tempRight, Same, ID, temp, DutyID |
| `SP_Consortia_All` | Player34 | Consortia |  |
| `SP_Consortia_Ally_Neutral` | Player34 | Consortia_Ally | ConsortiaID |
| `SP_Consortia_AllyByState` | Player34 | Consortia_Apply_Ally | ConsortiaID, State |
| `SP_Consortia_Apply_State` | Player34 | Consortia | ConsortiaID, UserID, State |
| `SP_Consortia_Badge_Config_All` | Game34 | Consortia_Badge, sys_users_detail |  |
| `SP_Consortia_Boss_Config_All` | Player34 | Consortia_Boss_Config |  |
| `SP_Consortia_Buff_Temp_All` | Player34 | Consortia_Buff_Temp |  |
| `SP_Consortia_Equip_Control_Add` | Player34 | Consortia, Consortia_Equip_Control | ConsortiaID, Level, Type, Riches, UserID, count, temp |
| `SP_Consortia_Level_All` | Game34 | Consortia_Level |  |
| `SP_Consortia_Scan` | Player34 | Consortia, Consortia_Equip_Control, Consortia_Apply_Users, Consortia_Invite_Users, Consortia_Apply_Ally, Consortia_Duty, Consortia_Users, Consortia_Ally, Consortia_Event, Sys_Users_Detail, Consortia_Level | NoticeID, ConsortiaIDs, s |
| `SP_Consortia_Single` | Player34 | V_Consortia, Consortia, Consortia_Level | ID, Level, Riches, SkillLevel, SkillRiches |
| `SP_Consortia_Skill_UpGrade` | Player34 | Consortia, Consortia_Level | ConsortiaID, UserID, Level, Riches, SkillLevel, SkillRiches |
| `SP_Consortia_Smith_UpGrade` | Player34 | Consortia, Consortia_Level | ConsortiaID, UserID, Level, Riches, SmithLevel, SmithRiches |
| `SP_Consortia_Store_UpGrade` | Player34 | Consortia, Consortia_Level | ConsortiaID, UserID, Level, Riches, StoreLevel, StoreRiches |
| `SP_Consortia_Task_All` | Game34 | Consortia_TaskConfig |  |
| `SP_Consortia_Task_Info_All` | Player34 | Consortia_Task_Info |  |
| `SP_Consortia_Task_Info_Create_Or_Update` | Player34 | Consortia_Task_Info, User_Messages | ConsortiaID, BeginTime, Contribution, Expirience, Offer, BuffID, Level, Riches, Time, ConditionData, RankTable, Count |
| `SP_Consortia_TaskAward` | Game34 | Consortia_TaskAward | lv |
| `SP_Consortia_Update_FightPower` | Player34 | Consortia, Employee_Cursor, Sys_Users_Detail | FightPower, ConsortiaID |
| `SP_ConsortiaAlly_Add` | Player34 | V_Consortia_Users, Consortia_Ally, Consortia, Consortia_Apply_Ally, Consortia_Event | ID, Consortia1ID, Consortia2ID, State, Date, ValidDate, IsExist, UserID, Right, AllyID, OldState, Consortia1Name, Consortia2Name |
| `SP_ConsortiaAlly_All` | Player34 | Consortia_Ally |  |
| `SP_ConsortiaApplyAlly_Pass` | Player34 | V_Consortia_Users, Consortia_Apply_Ally, Consortia_Ally, Consortia, Consortia_Event | ID, UserID, ConsortiaID, tempID, State, tempRight, AllyID, Consortia1Name, Consortia2Name |
| `SP_ConsortiaApplyUser_Delete` | Player34 | V_Consortia_Users, Consortia_Apply_Users | ID, UserID, ConsortiaID, tempRight, tempID |
| `SP_ConsortiaApplyUser_Pass` | Player34 | V_Consortia_Users, Consortia_Apply_Users, Consortia, Consortia_Duty, Consortia_Users, Consortia_Invite_Users, Sys_Users_Detail, Consortia_Event | ID, UserID, UserName, ConsortiaID, tempID, tempName, tempDutyID, tempDutyName, tempOffer, tempRichesOffer, tempRichesRob, tempLastDate, tempWin, tempTotal, tempEscape, tempGrade, tempLevel, tempCUID, tempState, tempSex, tempDutyRight, tempConsortiaRepute, tempLoginName, tempRight, DutyID, Count, MaxCount |
| `SP_ConsortiaChangeChairman` | Player34 | Consortia, Sys_Users_Detail, V_Consortia_Users, Consortia_Duty, Consortia_Users | NickName, ConsortiaID, UserID, tempUserID, tempUserName, tempDutyLevel, tempDutyName, tempRight, Count, ID, IsExist, Grade, CurrentLevel, CurrentID, CurrentName, Duty, MaxDuty |
| `SP_ConsortiaDuty_Delete` | Player34 | Consortia_Duty, V_Consortia_Users, Consortia_Users | UserID, ConsortiaID, DutyID, CurrentLevel, MaxLevel, MaxDuty, tempIsManageDuty |
| `SP_ConsortiaDuty_Update` | Player34 | V_Consortia_Users, Consortia_Duty | DutyID, ConsortiaID, DutyName, Level, UserID, UpdateType, Right, tempRight |
| `SP_ConsortiaInviteUser_Add` | Player34 | V_Consortia_Users, Sys_Users_Detail, Consortia, Consortia_Invite_Users, Sys_Users_Rank_Date | ID, ConsortiaID, ConsortiaName, InviteDate, InviteID, InviteName, IsExist, Remark, UserID, UserName, tempID, tempRight, tempConsortiaID, Count, MaxCount |
| `SP_ConsortiaInviteUser_Delete` | Player34 | Consortia_Invite_Users | ID, UserID |
| `SP_ConsortiaInviteUser_Pass` | Player34 | Consortia_Invite_Users, Consortia, Consortia_Duty, Consortia_Users, Consortia_Apply_Users, Sys_Users_Detail | ID, UserID, UserName, ConsortiaID, ConsortiaName, tempName, tempDutyID, tempDutyName, tempOffer, tempRichesOffer, tempRichesRob, tempLastDate, tempWin, tempTotal, tempEscape, tempID, tempGrade, tempLevel, tempCUID, tempState, tempSex, tempRight, tempConsortiaRepute, DutyID, Count, MaxCount |
| `SP_ConsortiaPlacard_Update` | Player34 | V_Consortia_Users, Consortia | ConsortiaID, UserID, Placard, tempRight |
| `SP_ConsortiaUser_Delete` | Player34 | V_Consortia_Users, Consortia, Consortia_Level, Consortia_Users, Sys_Users_Detail, Consortia_Event | UserID, KickUserID, ConsortiaID, NickName, Level, tempRight, KickDate, KickCount, KickMax, count |
| `SP_ConsortiaUserGrade_Update` | Player34 | V_Consortia_Users, Consortia_Duty, Consortia_Users | ID, ConsortiaID, UserID, UpGrade, tempUserName, tempDutyLevel, tempDutyName, tempRight, tempRight1, CurrentLevel, MaxLevel, Duty |
| `SP_ConsortiaUserRemark_Update` | Player34 | V_Consortia_Users, Consortia_Users | ID, ConsortiaID, UserID, Remark, tempRight |
| `SP_CustomPage` | Player34 | syscolumns, sysobjects, sysindexkeys, sysindexes | QueryStr, QueryWhere, PageSize, PageCurrent, FdShow, FdOrder, FdKey, TotalRow, FdName, Id1, Id2, Id3, Obj_ID, TotalPage, FdOrder_desc, FdOrder_desc1, FdOrder_desc2, strfd, strjoin, strwhere |
| `SP_CustomPage_Test` | Player34 | syscolumns, sysobjects, sysindexkeys, sysindexes | QueryStr, QueryWhere, PageSize, PageCurrent, FdShow, FdOrder, FdKey, TotalRow, FdName, Id1, Id2, Id3, Obj_ID, TotalPage, FdOrder_desc, FdOrder_desc1, FdOrder_desc2, strfd, strjoin, strwhere |
| `SP_Daily_Award_All` | Game34 | Daily_Award, Consortia_Level, Db_Tank | Deduct, NeedGold, NeedItem, Reward, Count, StoreRiches, SmithRiches, ShopRiches, KickMax, BufferRiches, setUpdate, count2 |
| `SP_Daily_Award_Single` | Game34 | Daily_Award, Consortia_Level, Db_Tank | awardDays, StoreRiches, SmithRiches, ShopRiches, KickMax, BufferRiches, setUpdate, count2 |
| `SP_DailyLogList_Add` | Player34 | DailyLogList | UserID, UserAwardLog, DayLog, Count |
| `SP_DailyLogList_Single` | Player34 | DailyLogList | UserID |
| `SP_delete_Item_Fusion` | Game34 | Item_Fusion | FusionID |
| `SP_Drop_Condiction_All` | Game34 | Drop_Condiction |  |
| `SP_Drop_Item_All` | Game34 | Drop_Item, Db_Tank |  |
| `SP_Drop_Item_NewRegister` | Player34 | Project_Game34, Drop_Condiction, Drop_Item |  |
| `SP_Edictum_All` | Game34 | Edictum_List |  |
| `SP_FairBattleReward_All` | Player34 | Project_Game34 |  |
| `Sp_Fetch_List` | Player34 |  | page_num, row_in_page, order_column, row_total, comb_condition, tablename, jcc_status, sql, row_ahead |
| `SP_Fight_Rate` | Game34 | Fight_Rate | serverId |
| `SP_Fight_Record_Add` | Player34 | Fight_Record | PlayBegin, PlayEnd, ChangeTeam, TeamA, TeamB, MapID, RoomType, FightName, WinTeam |
| `SP_Fusion_All` | Game34 | Item_Fusion |  |
| `SP_Fusion_All_Desc` | Game34 | Item_Fusion |  |
| `SP_Get_AvatarCollect` | Player34 | Sys_Users_AvatarCollection | UserID |
| `SP_Get_Marry_Apply` | Player34 | Marry_Apply | UserID |
| `SP_Get_SingleFarm` | Player34 | Sys_User_Farm | ID |
| `SP_Get_SingleFields` | Player34 | Sys_User_Field | ID |
| `SP_Get_User_AdoptPetList` | Player34 | AdoptPetList | UserID |
| `SP_Get_UserPet_By_ID` | Player34 | Sys_Users_Pet | UserID |
| `SP_Get_UserTexp_By_ID` | Player34 | Sys_Users_Texp | UserID |
| `SP_GetAllCommands` | Player34 | Game_Commands |  |
| `SP_GetPayState` | Player34 | charge_money | chargeId |
| `SP_GetSingle_RandomName` | Player34 | RandomName | Sex |
| `SP_GetSingleGemStone` | Player34 | Sys_User_Gemstone, Consortia_Equip_Control | ID, ConsortiaID, Level, Type |
| `SP_GetSingleNewChickenBox` | Player34 | New_ChickenBox_Data | UserID |
| `SP_GetSingleUserCard` | Player34 | Sys_Users_Card | UserID |
| `SP_GetSingleUserLeague` | Player34 | Sys_Users_League | UserID |
| `SP_GetSingleUserMatchInfo` | Player34 | Sys_User_Match_Info | UserID |
| `SP_GetSingleUserRank` | Player34 | Sys_User_Rank | UserID |
| `SP_GoldEquipTemplateLoad_All` | Game34 | GoldEquipTemplateLoad | Grade |
| `SP_Insert_Count_Server` | Player34 | Db_Count | ApplicationId, SubId, ServerId, UserCount, GameCount, DateTime |
| `SP_Insert_Count_Shop` | Player34 | Db_Count | ApplicatonId, SubId, UserId, Money, Gold, DateTime, Goods, GoodsType |
| `SP_Insert_Count_SystemPay` | Player34 | Db_Count | ApplicatonId, SubId, ConsumerId, Money, Gold, ConsumerType, SubConsumerType, DateTime |
| `SP_Insert_Marry_Apply` | Player34 | Marry_Apply | UserID, ApplyUserID, ApplyUserName, ApplyType, ApplyResult, LoveProclamation |
| `SP_Insert_Marry_Notice` | Player34 | Marry_Apply, sys_users_detail, Sys_Users_Detail | UserID, ApplyUserID, ApplyUserName, ApplyType, ApplyResult, LoveProclamation, AnswerId, ouototal, Counts, tempUserName |
| `SP_Insert_Marry_Room_Info` | Player34 | Marry_Room_Info, sys_users_detail | ID, Name, PlayerID, PlayerName, GroomID, GroomName, BrideID, BrideName, Pwd, AvailTime, MaxCount, GuestInvite, MapIndex, BeginTime, BreakTime, RoomIntroduction, ServerID, IsHymeneal, IsGunsaluteUsed, count |
| `SP_Insert_Update_Achievement` | Game34 | Achievement | ID, PlaceID, Title, Detail, NeedMinLevel, NeedMaxLevel, PreAchievementID, IsOther, AchievementType, CanHide, StartDate, EndDate, AchievementPoint, IsActive, PicID, IsShare, setUpdate, count2 |
| `SP_Insert_Update_Achievement_Goods` | Game34 | Achievement_Goods, Db_Tank | AchievementID, RewardType, RewardPara, RewardValueId, RewardCount, setUpdate, count2 |
| `SP_Insert_Update_AchievementCondition` | Game34 | AchievementCondition, Db_Tank34 | AchievementID, CondictionID, CondictionType, Condiction_Para1, Condiction_Para2, setUpdate, count2 |
| `SP_Insert_Update_Active` | Game34 | Active, Db_Tank | ActiveID, Title, Description, Content, AwardContent, HasKey, StartDate, EndDate, IsOnly, Type, ActionTimeContent, IsAdvance, GoodsExchangeTypes, GoodsExchangeNum, limitType, limitValue, IsShow, setUpdate, count |
| `SP_Insert_Update_BallList` | Game34 | Ball, Db_Tank | ID, Name, Power, Radii, FlyingPartical, BombPartical, Crater, AttackResponse, IsSpin, Mass, SpinVA, SpinV, Amount, Wind, DragIndex, Weight, Shake, ShootSound, BombSound, Delay, ActionType, HasTunnel, setUpdate, count |
| `SP_Insert_Update_bombconfig` | Game34 | BallConfig, Db_Tank | TemplateID, Common, CommonAddWound, CommonMultiBall, Special, setUpdate, count |
| `SP_Insert_Update_CardGrooveUpdate` | Game34 | Card_Groove_Update, Db_Tank | Level, Type, Exp, Attack, Defend, Agility, Lucky, Damage, Guard, setUpdate, count2 |
| `SP_Insert_Update_CardTemplateInfo` | Game34 | Card_Template_Info, Db_Tank | CardID, CardType, probability, AttackRate, AddAttack, DefendRate, AddDefend, AgilityRate, AddAgility, LuckyRate, AddLucky, DamageRate, AddDamage, GuardRate, AddGuard, setUpdate, count2 |
| `SP_Insert_Update_DailyAwardList` | Game34 | Daily_Award, Db_Tank | ID, Type, TemplateID, Count, ValidDate, IsBinds, Sex, Remark, CountRemark, GetWay, AwardDays, setUpdate, count2 |
| `SP_Insert_Update_Exercise` | Game34 | ExerciseInfo, Db_Tank | Grage, GP, ExerciseA, ExerciseAG, ExerciseD, ExerciseH, ExerciseL, setUpdate, count2 |
| `SP_Insert_Update_Game_Map` | Game34 | Game_Map | ID, Name, Description, ForegroundWidth, ForegroundHeight, BackroundWidht, BackroundHeight, DeadWidth, DeadHeight, Weight, DragIndex, ForePic, BackPic, DeadPic, Pic, Remark, BackMusic, PosX, Type, PosX1, setUpdate, count |
| `SP_Insert_Update_ItemStrengthen` | Game34 | Item_Strengthen, Db_Tank | StrengthenLevel, Rock, Random, Rock1, Rock2, Rock3, StoneLevelMin, setUpdate, count2 |
| `SP_Insert_Update_Map_Server` | Game34 | Map_Server, Db_Tank | ServerID, OpenMap, IsSpecial, setUpdate, count2 |
| `SP_Insert_Update_NPC_Info` | Game34 | NPC_Info | ID, Name, Level, Camp, Type, X, Y, Width, Height, Blood, MoveMin, MoveMax, BaseDamage, BaseGuard, Defence, Agility, Lucky, Attack, ModelID, ResourcesPath, DropRate, Experience, Delay, Immunity, Alert, Range, Preserve, Script, FireX, FireY, DropId, setUpdate, count |
| `SP_Insert_Update_Quest` | Game34 | Quest | ID, QuestID, Title, Detail, Objective, NeedMinLevel, NeedMaxLevel, PreQuestID, NextQuestID, IsOther, CanRepeat, RepeatInterval, RepeatMax, RewardGP, RewardGold, RewardGiftToken, RewardOffer, RewardRiches, RewardBuffID, RewardBuffDate, RewardMoney, RandDouble, TimeMode, StartDate, EndDate, MapID, AutoEquip, RewardMedal, Rank, StarLev, NotMustCount, setUpdate, count2 |
| `SP_Insert_Update_Quest_Condiction` | Game34 | Quest_Condiction, Db_Tank | QuestID, CondictionID, CondictionType, CondictionTitle, Para1, Para2, isOpitional, setUpdate, count2 |
| `SP_Insert_Update_Quest_Goods` | Game34 | Quest_Goods | QuestID, RewardItemID, IsSelect, RewardItemValid, RewardItemCount, StrengthenLevel, AttackCompose, DefendCompose, AgilityCompose, LuckCompose, IsCount, IsBind, setUpdate, count2 |
| `SP_Insert_Update_Quest_Rate` | Game34 | Quest_Rate | BindMoneyRate, ExpRate, GoldRate, ExploitRate, CanOneKeyFinishTime, count2 |
| `SP_Insert_Update_RuneTemplate` | Game34 | Rune_Template | TemplateID, NextTemplateID, Name, BaseLevel, MaxLevel, Type1, Attribute1, Turn1, Rate1, Type2, Attribute2, Turn2, Rate2, Type3, Attribute3, Turn3, Rate3, setUpdate, count2 |
| `SP_Insert_Update_Server_Config` | Player34 | Server_Config, Db_Tank | ID, Name, Value, setUpdate, count2 |
| `SP_Insert_Update_Shop_Goods_Box` | Game34 | Shop_Goods_Box, Db_Tank | ID, TemplateId, IsSelect, IsBind, ItemValid, ItemCount, StrengthenLevel, AttackCompose, DefendCompose, AgilityCompose, LuckCompose, Random, IsTips, IsLogs, setUpdate, count |
| `SP_Insert_Update_ShopItemList` | Game34 | Shop | ID, ShopID, GroupID, TemplateID, BuyType, IsContinue, IsBind, IsVouch, Label, Beat, AUnit, APrice1, AValue1, APrice2, AValue2, APrice3, AValue3, BUnit, BPrice1, BValue1, BPrice2, BValue2, BPrice3, BValue3, CUnit, CPrice1, CValue1, CPrice2, CValue2, CPrice3, Sort, CValue3, IsCheap, LimitCount, StartDate, EndDate, setUpdate, count |
| `SP_Insert_Update_TemplateAlllist` | Game34 | Shop_Goods | TemplateID, Name, Remark, CategoryID, Description, Attack, Defence, Agility, Luck, Level, Quality, Pic, MaxCount, NeedSex, NeedLevel, CanStrengthen, CanCompose, CanDrop, CanEquip, CanUse, CanDelete, Script, Data, Colors, Property1, Property2, Property3, Property4, Property5, Property6, Property7, Property8, Valid, Count, AddTime, BindType, FusionType, FusionRate, FusionNeedRate, Hole, RefineryLevel, ReclaimValue, ReclaimType, CanRecycle, SuitId, FloorPrice, CanTransfer, setUpdate, countItems |
| `SP_Item_Refinery_All` | Game34 | Item_Refinery |  |
| `SP_Item_Strengthen_All` | Game34 | Item_Strengthen |  |
| `SP_Item_StrengthenGoodsInfo_All` | Game34 | Item_Strengthen_Goods |  |
| `SP_Items_All` | Player34 | Shop_Goods |  |
| `SP_Items_All_ASC` | Game34 | Shop_Goods |  |
| `SP_Items_Category_All` | Game34 | Shop_Goods_Categorys |  |
| `SP_Items_Category_Single` | Player34 | Shop_Goods | CategoryID |
| `SP_Items_FusionType` | Game34 | Shop_Goods |  |
| `SP_Items_Name_Single` | Game34 | Shop_Goods | name |
| `SP_Items_Single` | Player34 | Shop_Goods | ID |
| `SP_Mail_BySenderID` | Player34 | User_Messages | UserID |
| `SP_Mail_ByUserID` | Player34 | User_Messages | UserID |
| `SP_Mail_Delete` | Player34 | User_Messages, Sys_Users_Goods | ID, UserID, SenderID, Annex1, Annex2, Type, Sender, ReceiverID, Receiver, Title, Money, Annex3, Annex4, Annex5, NewTitle, NewContent, Remark |
| `SP_Mail_PaymentCancel` | Player34 | User_Messages | userID, mailID, SenderID, Sender, ReceiverID, Receiver, Title, Annex1, Annex2, Type, Remark, money, Annex3, Annex4, Annex5, NewTitle, NewContent |
| `SP_Mail_Scan` | Player34 | User_Messages | NoticeUserID, AuctionID, AuctioneerID, AuctioneerName, BuyerID, BuyerName, ItemID, PayType, Price, Name, MailID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, Remark, Annex3, Annex4, Annex5 |
| `SP_Mail_ScanTwo` | Player34 | User_Messages | NoticeUserID, AuctionID, AuctioneerID, AuctioneerName, BuyerID, BuyerName, ItemID, PayType, Price, Name, MailID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, Remark, Annex3, Annex4, Annex5 |
| `SP_Mail_Send` | Player34 | User_Messages | ID, SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist, Type, Annex1Name, Annex2Name, Annex3, Annex4, Annex5, Annex3Name, Annex4Name, Annex5Name, ValidDate, AnnexRemark, GiftToken, Remark |
| `SP_Mail_Single` | Player34 | User_Messages | ID, UserID |
| `SP_Maps_Award_All` | Game34 | Map_Award |  |
| `SP_MarryInfo_Delete` | Player34 | Marry_Info | ID, UserID |
| `SP_NPC_Info_All` | Game34 | NPC_Info |  |
| `SP_PayState` | Player34 | charge_money | chargeId |
| `SP_PetSkillTemplateInfo_All` | Game34 | Pet_Skill_Template_Info |  |
| `SP_PetStarExp_All` | Game34 | Pet_Star_Exp |  |
| `SP_PetTemplateInfo_All` | Game34 | Pet_Template_Info |  |
| `SP_PveInfos_All` | Game34 | Pve_Info |  |
| `SP_QQtipsMessages_All` | Game34 | QQtips_Messages |  |
| `SP_Quest_Goods_All` | Game34 | Quest_Goods |  |
| `SP_Quest_Rate_All` | Game34 | Quest_Rate |  |
| `SP_Quest_Single` | Game34 | Quest | QuestId |
| `SP_QuestData_All` | Player34 | QuestData | UserID |
| `SP_Rate` | Player34 | Rate | serverId |
| `SP_Rate_WithType` | Player34 | Rate | serverId, type |
| `Sp_Renames_Batch` | Player34 | A | Db_A |
| `SP_ReturnItem` | Player34 | User_Messages, Sys_users_Goods |  |
| `SP_RuneTemplate_All` | Game34 | Rune_Template | Grade |
| `SP_SearchGoodsTemp_All` | Game34 | Search_Goods_Temp, Server_Config | Key |
| `SP_Select_Marry_Prop` | Player34 | sys_users_detail | UserID |
| `SP_Server_Config` | Player34 | Server_Config |  |
| `SP_Server_Config_Single` | Player34 | Server_Config | Key |
| `SP_Server_Config_Update` | Player34 | Server_Config | Key, Value, Counts, Maxs |
| `SP_Service_List` | Player34 | Server_List, Server_Config |  |
| `SP_Service_Update` | Player34 | Server_List | ID, State, Online |
| `SP_Shop_All` | Game34 | Shop |  |
| `SP_ShopGoodsShowList_All` | Game34 | ShopGoodsShowList |  |
| `SP_ST_GetInfoRank` | Player34 | Sys_Users_DanhHieu | TemplateID |
| `SP_StrengThenExp_All` | Game34 | StrengThenExp | Grade |
| `SP_SubActive_All` | Game34 | Sub_Active_List |  |
| `SP_SubActiveCondition_All` | Game34 | Sub_Active_Condition | ActiveID |
| `SP_Suit_Manager_ADD` | Player34 | Suit_Manager | UserID |
| `SP_Suit_Manager_GET` | Player34 | Suit_Manager | UserID |
| `SP_Suit_Manager_Reset` | Game34 | Suit_Manager | UserID |
| `SP_Suit_Manager_Update` | Game34 | Suit_Manager | kill, UserID |
| `SP_Suit_TemplateID` | Game34 | Suit_TemplateID |  |
| `SP_Sys_Clear_Auction` | Player34 |  |  |
| `SP_Sys_Clear_Consortia` | Player34 |  |  |
| `SP_Sys_Clear_Items` | Player34 |  |  |
| `SP_Sys_Clear_Messages` | Player34 | User_Messages | date |
| `SP_Sys_Clear_State` | Player34 | Server_List, Sys_Users_Detail |  |
| `Sp_Sys_DataBaseSet` | Player34 |  |  |
| `SP_Sys_Insert_TestID` | Player34 |  | startID, endID, temp |
| `Sp_Sys_QuestData` | Player34 | QuestData |  |
| `SP_Sys_Truncate_UserAllInfo` | Player34 |  |  |
| `SP_Sys_Update_BestEquip` | Player34 | Sys_Users_Goods, Sys_Users_Detail, Project_Game34 |  |
| `SP_Sys_Update_Users_List` | Player34 | Sys_Users_Detail, Sys_Users_Order |  |
| `SP_Sys_Update_Users_Rank_Date` | Player34 | Sys_Users_Detail, Sys_Users_Rank_Date, Consortia |  |
| `SP_Sys_Update_Users_WeekList` | Player34 | Sys_Users_Detail |  |
| `SP_Tank_Count_Login` | Player34 | Db_Count, Db_Tank | AppID, SubID, MaxDate |
| `SP_Totem_All` | Game34 | Totem_Info | Grade |
| `SP_TotemHonorTemplate_All` | Game34 | Totem_Honor_Template | Grade |
| `SP_Update_Marry_Room_Info` | Player34 | Marry_Room_Info | ID, AvailTime, BreakTime, roomIntroduction, isHymeneal, Name, Pwd, IsGunsaluteUsed |
| `SP_Update_Repute_FightPower` | Player34 | Sys_Users_Detail, Employee_Cursor, Sys_User_Rank | Repute, UserID |
| `SP_Update_User_AdoptPet` | Player34 | AdoptPetList | ID |
| `SP_Update_User_Extra` | Player34 | Sys_Users_Extra | UserID, LastTimeHotSpring, MinHotSpring, coupleBossEnterNum, coupleBossHurt, coupleBossBoxNum, LastFreeTimeHotSpring, isGetAwardMarry, isFirstAwardMarry, LeftRoutteCount, LeftRoutteRate, FreeSendMailCount, count |
| `SP_UpdateGemStoneInfo` | Player34 | Sys_User_Gemstone | ID, UserID, FigSpiritId, FigSpiritIdValue, EquipPlace |
| `SP_UpdateLabyrinthInfo` | Player34 | Sys_Users_Labyrinth, Consortia_Duty, Consortia_Users, Consortia_Apply_Users, Consortia_Invite_Users, Consortia, Sys_Users_Detail, Consortia_Event | UserID, myProgress, myRanking, completeChallenge, isDoubleAward, currentFloor, accumulateExp, remainTime, currentRemainTime, cleanOutAllTime, cleanOutGold, tryAgainComplete, isInGame, isCleanOut, serverMultiplyingPower, LastDate, ProcessAward |
| `SP_UpdateUserMatch` | Player34 | Sys_User_Match_Info, Sys_Users_Detail | ID, UserID, dailyScore, dailyWinCount, dailyGameCount, DailyLeagueFirst, DailyLeagueLastScore, weeklyScore, weeklyGameCount, weeklyRanking, addDayPrestge, totalPrestige, restCount, leagueGrade, leagueItemsGet, WeeklyWinCount |
| `SP_UpdateUserRank` | Player34 | Sys_User_Rank | ID, UserID, UserRank, Attack, Defence, Luck, Agility, HP, Damage, Guard, BeginDate, Validate, IsExit, NewTitleID, EndDate |
| `SP_UpdateUsersEventProcess` | Player34 | Sys_Users_EventProcess | UserID, ActiveType, Conditions, AwardGot, count |
| `SP_User_AdoptPet` | Player34 | AdoptPetList | TemplateID, Name, UserID, Attack, Defence, Luck, Agility, Blood, Damage, Guard, AttackGrow, DefenceGrow, LuckGrow, AgilityGrow, BloodGrow, DamageGrow, GuardGrow, Skill, SkillEquip, Place, IsExit, IsUse, ID |
| `SP_User_Buff_Add` | Player34 | User_Buff | UserId, Type, BeginDate, Data, IsExist, ValidDate, ValidCount, Value, TemplateID, temp |
| `SP_User_Update_BoxProgression` | Player34 | Sys_Users_Detail | UserID, BoxProgression, GetBoxLevel, AddGPLastDate, BoxGetDate, AlreadyGetBox |
| `SP_UserLeague_Update` | Player34 | Sys_Users_League | ID, UserID, RankID, Point, Win, Lose, IsBanned, ForbidDate, ForbidReason |
| `SP_UserMatch_All_DESC` | Player34 | Sys_User_Match_Info |  |
| `SP_Users_Active` | Player34 | Sys_Users_Detail, Sys_Users_Fight, Sys_VIP_Info, Sys_Users_Texp, DailyLogList | UserID, Attack, Colors, ConsortiaID, Defence, Gold, GP, Grade, Luck, Money, Style, Agility, State, UserName, PassWord, Sex, Hide, ActiveIP, Skin, Site, count |
| `SP_Users_Cards_Add` | Player34 | Sys_Users_Card | CardID, Count, UserID, Place, TemplateID, isFirstGet, Attack, Defence, Luck, Agility, Damage, Guard, Level, CardGP, temp |
| `SP_Users_ChangSexByCard` | Player34 | Sys_Users_Detail | UserId, Sex |
| `SP_Users_CheckByNickName` | Player34 | Sys_Users_Detail, Rename_Nick | NickName |
| `SP_Users_Farm_Update` | Player34 | Sys_User_Farm | ID, FarmID, PayFieldMoney, PayAutoMoney, AutoPayTime, AutoValidDate, VipLimitLevel, FarmerName, GainFieldId, MatureId, KillCropId, isAutoId, isFarmHelper, buyExpRemainNum, isArrange, TreeLevel, TreeExp, LoveScore, MonsterExp, PoultryState, CountDownTime, TreeCostExp |
| `SP_Users_Friends_Good` | Player34 | Sys_Users_Detail, Sys_Users_Friends | UserName, UserId |
| `SP_Users_FriendsBbs` | Player34 | split, Sys_Users_Detail | SearchUserName |
| `SP_Users_Gift_Add` | Player34 | Sys_Users_Gift | SenderID, ReceiverID, TemplateID, Count |
| `SP_Users_Gift_Single` | Player34 | Sys_Users_Gift, Sys_Users_Goods | UserID, IsReceive, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, Skin, IsUsed, RemoveType, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6, StrengthenTimes, Hole5Level, Hole5Exp, Hole6Level, Hole6Exp, IsGold, goldValidDate, StrengthenExp, goldBeginTime, Blood, temp |
| `SP_Users_Items_Equip` | Player34 | Sys_Users_Goods | UserID |
| `SP_Users_Items_Equip_By_Nick` | Player34 | Sys_Users_Detail, Sys_Users_Goods | NickName, UserID, count |
| `SP_Users_Items_Single` | Player34 | Sys_Users_Goods | ID |
| `SP_Users_Items_Update` | Player34 | Sys_Users_Goods | ItemID, UserID, TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, BagType, Skin, IsUsed, RemoveDate, RemoveType, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6, StrengthenTimes, Hole5Level, Hole5Exp, Hole6Level, Hole6Exp, IsGold, goldBeginTime, goldValidDate, StrengthenExp, Blood, latentEnergyCurStr, latentEnergyNewStr, latentEnergyEndTime, curExp, cellLocked |
| `SP_Users_LoginWeb` | Player34 | Sys_Users_Detail, V_Sys_Users_Detail | UserName, PassWord, FirstValidate, NickName, forbidDate, isExist, lastDate, lastDateSecond, lastDateThird, loginCount, isFirst, DayLoginCount |
| `SP_Users_Password_Add` | Player34 | Sys_Users_Password | UserID, PasswordQuestion1, PasswordAnswer1, PasswordQuestion2, PasswordAnswer2, FailedPasswordAttemptCount, Counts |
| `SP_Users_PasswordInfo` | Player34 | Sys_Users_Password | UserID |
| `SP_Users_Record_Add` | Player34 | Sys_Users_Record | UserID, RecordID, Total, count |
| `SP_Users_Register` | Player34 | Sys_Users_Detail, Project_Game34, Sys_Users_Goods | UserName, PassWord, NickName, BArmID, BHairID, BFaceID, BClothID, GArmID, GHairID, GFaceID, GClothID, ArmColor, HairColor, FaceColor, ClothColor, Sex, ArmID, HairID, FaceID, ClothID, isFirst, UserID, CategoryID, Attack, Defence, Agility, Luck, style, color, count |
| `SP_Users_RegisterNotValidate` | Player34 | Sys_Users_Detail, Project_Game34 | UserName, PassWord, NickName, BArmID, BHairID, BFaceID, BClothID, BHatID, GArmID, GHairID, GFaceID, GClothID, GHatID, ArmColor, HairColor, FaceColor, ClothColor, HatColor, Sex, StyleDate, ArmID, HairID, FaceID, ClothID, HatID, isFirst, UserID, CategoryID, Attack, Defence, Agility, Luck, tempSex, style, color, nickIsExist, ArmPic, HairPic, FacePic, ClothPic, HatPic |
| `SP_Users_RegisterNotValidate2` | Player34 | Sys_Users_Detail, Sys_Users_Goods | UserName, PassWord, NickName, BArmID, BHairID, BFaceID, BClothID, BHatID, ArmPic, HairPic, FacePic, ClothPic, HatPic, GArmID, GHairID, GFaceID, GClothID, GHatID, ArmColor, HairColor, FaceColor, ClothColor, HatColor, Sex, StyleDate, CategoryID, Attack, Defence, Agility, Luck, ArmID, HairID, FaceID, ClothID, HatID, isFirst, UserID, tempSex, style, color, nickIsExist |
| `SP_Users_Reload` | Player34 | V_Sys_Users_Detail, User_Messages | ID |
| `SP_Users_RenameByCard` | Player34 | Sys_Users_Detail, Rename_Nick, Consortia_Users | UserName, NickName, NewNickName, UserID, count, Rename |
| `SP_Users_RenameConsortiaName` | Player34 | Consortia, Rename_Consortia | UserName, NickName, ConsortiaName, ConsortiaID, count, Rename |
| `SP_Users_RenameNick2` | Player34 | Sys_Users_Detail, Rename_Nick, Consortia, Consortia_Users | UserName, NickName, NewNickName, UserID, count, Rename |
| `SP_Users_SingleAllUserID` | Player34 | V_Sys_Users_Detail | userID |
| `SP_Users_Update` | Player34 | Sys_Users_Detail | UserID, Attack, Defence, Luck, Agility, Gold, Money, Style, Colors, Hide, Grade, GP, State, ConsortiaID, ExpendDate, Win, Total, Escape, Skin, Offer, AntiAddiction, RichesOffer, RichesRob, CheckCount, MarryInfoID, DayLoginCount, Nimbus, LastAward, GiftToken, PvePermission, FightPower, AnswerSite, LastAuncherAward, hp, ChatCount, SpaPubGoldRoomLimit, LastSpaDate, FightLabPermission, SpaPubMoneyRoomLimit, IsInSpaPubGoldToday, IsInSpaPubMoneyToday, AchievementPoint, LastWeekly, LastWeeklyVersion, WeaklessGuildProgressStr, IsOldPlayer, VIPLevel, VIPExp, Score, OptionOnOff, isOldPlayerHasValidEquitAtLogin, badLuckNumber, luckyNum, lastLuckyNumDate, lastLuckNum, IsShowConsortia, NewDay, Medal, Honor, VIPNextLevelDaysNeeded, IsRecharged, IsGetAward, typeVIP, evolutionGrade, evolutionExp, hardCurrency |
| `SP_Users_UpdateCharmGP` | Player34 | Sys_Users_Detail | UserID, CharmGP |
| `SP_UsersAcademy_Update` | Player34 | Sys_Users_Detail | UserID, apprenticeshipState, masterID, masterOrApprentices, graduatesCount, honourOfMaster, freezesDate |
| `SP_UsersState_SingleByNickName` | Player34 | Sys_Users_Detail | NickName |
| `SP_UsersState_SingleByUserName` | Player34 | Sys_Users_Detail | UserName |
| `SP_UserTexp_Add` | Player34 | Sys_Users_Texp | UserID, spdTexpExp, attTexpExp, defTexpExp, hpTexpExp, lukTexpExp, texpTaskCount, texpCount, texpTaskDate, count |
| `ɛdbo` | Db_Membership | Mem_Application, Mem_Users, Mem_UserInfo | ApplicationName, UserName, Password, UserId, ApplicationId |
