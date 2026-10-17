-- SQL_STORED_PROCEDURE dbo.Ddtc_Sys_Users_Info_Sto (modified 2012-04-21T07:53:25.170)

CREATE      PROCEDURE [dbo].[Ddtc_Sys_Users_Info_Sto]
@SearchKey nvarchar(200)=N'' ,
@Role Int,
@BeginDate DateTime,
@EndDate DateTime,
@Msg Varchar(50) OUTPUT,
@UserID int =0 
AS
/*第一步：如果当前时间范围是5点，系统则不运行下面程序*/
  If(DATEPART(hh,GETDATE())=5)
    Begin
      Set @Msg='每天5:00~5:59为后台维护时间'
      Return
    End
  /*第二步：获取用户相关信息*/
  --Declare @ByteSearchKey               /*定义用户编号*/
  Declare @UserName  nvarchar(50)   /*定义1、用户名*/
  Declare @NickName  nvarchar(50)   /*定义2、昵称*/
  Declare @str varchar(50)  /*定义 接收礼卷返回值*/
  --Set @UserID=0
if @UserID=0
begin
  If @Role=1  /*提供类型为用户名*/
     Begin

       SELECT Top 1 @UserID=IsNull(UserId,0),@UserName=UserName,@NickName=NickName FROM 
Db_Tank_Copy.Dbo.Sys_Users_Detail 
              Where UserName = @SearchKey
     End 
  Else        /*提供类型为昵称*/
     Begin
       SELECT Top 1 @UserID=IsNull(UserId,0),@UserName=UserName,@NickName=NickName FROM 
Db_Tank_Copy.Dbo.Sys_Users_Detail 
              Where NickName =  @SearchKey
     End
end  
If @UserID <1
Begin
      Set @Msg='未找到该用户'
      Return
End 
  /*第三步查询用户基本信息*/    
  Select Top 0 * From Ddt_User_Info_Veiw
  Union All
  Select UserID, UserName,   NickName, Date, 
         Consortia=Case IsConsortia  When 0 Then '未加入工会' Else '已加入工会' End,         
         Sexs=Case Sex When 1 Then '男' Else '女' End,
         Win, Total, [Escape], GP, Honor, Gold, Money,
         Grade, State,  Repute, LastDate, ChargeDate, ExpendDate, ActiveIP, ForbidDate,  Offer, IsExist, 
ReputeOffer, LastDateSecond, 
         LastDateThird, LoginCount, OnlineTime, AntiAddiction, AntiDate 
  From   Db_Tank_Copy.Dbo.Sys_Users_Detail  Where UserId=@UserID

  /*第四步查询用户的邮件*/

  Create Table #UserMail(MailType Varchar(10), Sender Varchar(50),Receiver NVarchar(50),Title Varchar(1000),
                         Content Varchar(2000),SendTime DateTime,ReadStatic Varchar(20),
                         DelStatic Varchar(20),
                         EndGold Int,
                         EndMoney Int,
			 EndGiftToken Int,
                         OldGold Varchar(10),
                         OldMoney Varchar(10),
			 OldGiftToken Varchar(10),
                         TypeStatics Varchar(20),
                         EndAnnex1 Varchar(50),
                         EndAnnex2 Varchar(50),
                         EndAnnex3 Varchar(50),
                         EndAnnex4 Varchar(50),
                         EndAnnex5 Varchar(50),
                         OldAnnex1 Varchar(20),
                         OldAnnex2 Varchar(20),
                         OldAnnex3 Varchar(20),
                         OldAnnex4 Varchar(20),
                         OldAnnex5 Varchar(20),
			 ValidDate int)
  Insert Into #UserMail
  Select  MailType=Case SenderID When @UserID Then '发件箱' Else '收件箱' End ,
          Sender,Receiver, Title, Content, SendTime, 
          ReadStatic= Case IsRead When 1 Then '已读' Else '未读' End, 
          DelStatic = Case IsExist When 1 Then '保存' Else '已删除' End,
          EndGold=Gold,             --剩余金币
          EndMoney=Money,           --剩余点券
	  EndGiftToken=GiftToken,   --剩余礼券
          OldGold= Replace(dbo.Get_StrArrayStrOfIndex(remark,':',2),',Money',''), --邮寄金币
          OldMoney=Replace(dbo.Get_StrArrayStrOfIndex(remark,':',3),',Annex1',''), --邮寄点券
          --OldGiftToken=Replace(dbo.Get_StrArrayStrOfIndex(remark,':',9),',GiftToken',''), --邮寄礼券
	  case when charIndex('GiftToken',remark)<=0 Then '0'
           Else Replace(dbo.Get_StrArrayStrOfIndex(remark,':',9),',GiftToken','')  End OldGiftToken,
          TypeStatics=Case Type When 0 Then '默认'
                               When 1 Then '普通邮件' 
                               When 2 Then '拍卖成功'
                               When 3 Then '拍卖失败'
                               When 4 Then  '竞标成功'
                               When 5 Then  '竞标失败'
                               When 6 Then  '返回付款'
                               When 7 Then  '付款退回'
                               When 8 Then  '购买物品'
                               When 9 Then  '物品过期'
                               When 10 Then  '赠送物品'
                               When 11 Then  '付款邮件'
                               When 12 Then  '打开物品'
                               When 51 Then  '后台赠送'
                               When 52 Then  '活动领取'
                               When 101 Then  '付费邮件'
                               Else '其他:'+Cast(Type As Varchar(10)) End ,         
          EndAnnex1=Annex1,  --剩余附件一
          EndAnnex2=Annex2,  --剩余附件二
          EndAnnex3=Annex3,  --剩余附件三
          EndAnnex4=Annex4,  --剩余附件四
          EndAnnex5=Annex5,  --剩余附件五
          OldAnnex1=Replace(Replace(dbo.Get_StrArrayStrOfIndex(remark,':',4),'Annex2',''),',',''),    --邮件附件一
          OldAnnex2=Replace(Replace(dbo.Get_StrArrayStrOfIndex(remark,':',5),',Annex3',''),',',''),   --邮件附件二
          OldAnnex3=Replace(Replace(dbo.Get_StrArrayStrOfIndex(remark,':',6),',Annex4',''),',',''),   --邮件附件三
          OldAnnex4=Replace(Replace(dbo.Get_StrArrayStrOfIndex(remark,':',7),',Annex5',''),',',''),   --邮件附件四
          --OldAnnex5=dbo.Get_StrArrayStrOfIndex(remark,':',8),   --邮件附件五
  	  OldAnnex5=Replace(Replace(dbo.Get_StrArrayStrOfIndex(@str,':',8),',GiftToken',''),',',''),   --邮件附件五
          ValidDate
  From Db_Tank_Copy.Dbo.User_Messages
       Where SenderId= @UserID  Or ReceiverId=@UserID
        Order by id desc

--select * from #UserMail
  --邮件数据 
 Select Top 0 * From Ddt_User_Mail_Veiw
  Union All
  Select * ,Good1Name=(Select Top 1 B.Name From Db_Tank_Copy.Dbo.Sys_Users_Goods A 
                              Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                                   On A.TemplateId=B.TemplateId 
                              Where A.ItemId=#UserMail.OldAnnex1)
           ,Good2Name=(Select Top 1 B.Name From Db_Tank_Copy.Dbo.Sys_Users_Goods A 
                              Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                                   On A.TemplateId=B.TemplateId 
                              Where A.ItemId=#UserMail.OldAnnex2)
           ,Good3Name=(Select Top 1 B.Name From Db_Tank_Copy.Dbo.Sys_Users_Goods A 
                              Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                                   On A.TemplateId=B.TemplateId 
                              Where A.ItemId=#UserMail.OldAnnex3)
           ,Good4Name=(Select Top 1 B.Name From Db_Tank_Copy.Dbo.Sys_Users_Goods A 
                              Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                                   On A.TemplateId=B.TemplateId 
                              Where A.ItemId=#UserMail.OldAnnex4)
           ,Good5Name=(Select Top 1 B.Name From Db_Tank_Copy.Dbo.Sys_Users_Goods A 
                              Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                                   On A.TemplateId=B.TemplateId 
                              Where A.ItemId=#UserMail.OldAnnex5)
           From #UserMail
   Order By SendTime Desc
         
   /*第五步：用户购买记录*/   
   Select Top 0 * From Ddt_User_Shop_Veiw
   Union All
   Select A.Id,@UserName As UserName,@NickName As NickName,A.Money,A.Gold,A.EnterTime,B.Name,B.TemplateID,
            (len(A.goodid) - len(replace(A.goodid+',',Cast(B.TemplateID As Varchar(10))+',','')))/len(Cast
(B.TemplateID As Varchar(10))) as counts
          From Count_Shop A ,Ddtc_Shop_Goods B
                 Where CharIndex(','+Cast(B.TemplateID as Varchar(10))+',',','+A.goodid+',')>0  
			           And A.EnterTime>=@BeginDate
				       And A.EnterTime<=@EndDate
                       And A.Money>0
                       And A.UserId=@UserId
                       Order By EnterTime Desc


 

   /*第六步：用户充值记录*/   
   Select top 0 * From Ddt_User_Charge_Veiw
   Union All
   Select   ChargeID, UserName, Money, Date,CanStatic=Case CanUse When 0 Then '已到帐' Else '未到帐' End, 
PayWay, NeedMoney, IP From  Db_Tank_Copy.Dbo.Charge_Money Where 
 userName=@userName
   
   /*第七步：用户任务*/    
Select top 0 * From Ddt_User_Quest_B_Veiw
 Union All
  SELECT A.UserID, A.QuestID,
          Complete =Case A.IsComplete When 1 Then '已完成' Else '未完成' End, A.CompletedDate, 
          Exist=Case A.IsExist When 1 Then '接受' Else '放弃' End, B.Title, B.Detail, 
B.Objective,B.StartDate, B.EndDate
          From Db_Tank_Copy.Dbo.QuestData A
               Left Outer Join Db_Tank_Copy.Dbo.Quest B
               On A.QuestId=B.QuestId
               Where A.UserId=@UserID 			     
 
  /*第八步：用户身上物品*/

  Create Table #Temp_Goods(BagType Int , Place  Int , [Count]  Int, StrengthenLevel Varchar(5), AttackCompose 
Varchar(5),  DefendCompose  Varchar(5), LuckCompose Varchar(5), 
AgilityCompose  Varchar(5), BeginDate  Varchar(20), ValidDate  Varchar(15),IsExist Bit,GoodsName Varchar
(100),TemplateID Int,IsBinds bit,IsUsed bit,RemoveDate DateTime,RemoveType Int,Hole1 varchar(50),Hole2 varchar(50),Hole3 varchar(50))
  Insert Into #Temp_Goods
  Select A.BagType,A.Place, A.[Count],A.StrengthenLevel, A.AttackCompose, 
         A.DefendCompose, A.LuckCompose, A.AgilityCompose,A.BeginDate, A.ValidDate,
         A.IsExist,B.Name,A.TemplateId,A.IsBinds,A.IsUsed,A.RemoveDate,A.RemoveType,
	 (select Name from db_tank_copy.dbo.shop_goods where templateid=A.Hole1) as Hole1,
	 (select Name from db_tank_copy.dbo.shop_goods where templateid=A.Hole2) as Hole2,
	 (select Name from db_tank_copy.dbo.shop_goods where templateid=A.Hole3) as Hole3
         FROM  Db_Tank_Copy.Dbo.Sys_Users_Goods A                   
                Left Outer Join Db_Tank_Copy.Dbo.Shop_Goods B
                     On A.TemplateId=B.TemplateId
        Where A.UserId=@UserId


 --用户资料与用户信息绑定  
  Select Top 0 * From Ddt_User_Goods_Veiw
  Union All
  Select Cast('身上物品' As Varchar(20)) As ItemPlace, *  From #Temp_Goods   Where BagType=0 And Place>=0 And 
Place <=30
  Union All
  Select Cast('装备物品' As Varchar(20)) As ItemPlace, *  From #Temp_Goods   Where BagType=0 And Place>=31 
And Place <=79
  Union All
  Select Cast('道具物品' As Varchar(20))  As ItemPlace, *  From #Temp_Goods   Where BagType=1 And Place>=0 
And Place <=49
  Union All
  Select Cast('公会保管箱物品' As Varchar(20)) As ItemPlace, *  From #Temp_Goods   Where BagType=11 And 
Place>=0 And Place <=99
  Union All
  Select '拍卖行或邮件暂存物品' , *  From #Temp_Goods   Where BagType=-1 And IsExist=1
  Union All
  Select '删除物品' , *  From #Temp_Goods   Where  IsExist=0
   order by  itemplace,removedate

  /*第九步：拍卖场*/  
select top 0 * from Ddt_User_Auction_Veiw
Union All
Select * From (
  Select AuctionObject= Case AuctioneerId When @UserId Then '出售记录' Else '收购记录' End ,  
         AuctionID, Name, Category, AuctioneerID, AuctioneerName, ItemID, 
         PayStatic= Case PayType When 1 Then '点券交易' Else '金币' End , Price, Rise, Mouthful, BeginDate, 
ValidDate, BuyerID, BuyerName, 
         ExistStatic =Case IsExist When 1 Then '进行中' Else '已结束' End
         From Db_Tank_Copy.Dbo.Auction 
             Where AuctioneerId=@UserId Or BuyerID=@UserId) A
         Order by AuctionID

  Set @Msg='查询信息成功'

GO
