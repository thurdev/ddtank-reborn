-- SQL_STORED_PROCEDURE dbo.SP_Active_PullDown (modified 2021-06-04T05:18:34.450)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户领取活动中物品>
-- Remark:HasKey 0为不能领取，1为激活码领取，2为特定用户ID领取，3为所有用户ID领取
-- =============================================
CREATE Procedure [dbo].[SP_Active_PullDown]
@ActiveID int,
@AwardID Nvarchar(200),
@UserID int
as

--第一步:判断当前活动与激活码是否有效
Declare  @StartDate DateTime
Declare  @EndDate DateTime
Declare  @HasKey Int
Select @StartDate=StartDate,@EndDate=EndDate,@HasKey=HasKey From [Project_Game34].[dbo].Active Where ActiveID=@ActiveID 
If Datediff(s,@StartDate,Getdate()) < 0
   Begin
     Return 7
   End
If Datediff(s,@EndDate,Getdate()) > 0
   Begin
     Return 8
   End
Declare @PullDown Bit 
Declare @Mark Int
set @Mark=0
If @HasKey=1                              /*HasKey验证*/
   Begin      
      Select @ActiveID=Isnull(ActiveID,0),@PullDown=Isnull(PullDown,0),@Mark=Mark From  Active_Number Where ActiveID=@ActiveID and AwardID =@AwardID
      If @ActiveID=0 or @PullDown is null /*验证AwardID*/
         Begin
           Return 4
         End
      If @PullDown=1
         Begin
           Return 5
         End
      Declare @CanGet bit
      Select @CanGet=Isnull(IsOnly,0) From [Project_Game34].[dbo].Active Where IsOnly=1 And ActiveID In (Select ActiveID From Active_Number Where UserID=@UserID and ActiveID=@ActiveID)
      If @CanGet=1                         /*验证唯一*/
         Begin
           Return 6
         End
   End 
Else If @HasKey=2
   Begin
    -- Set @AwardID = @ActiveID + '-2-' + @UserID     
     Set @AwardID = cast(@ActiveID as nvarchar(20)) + '-2-' + cast(@UserID as nvarchar(20))
     Select @ActiveID=IsNull(ActiveID,0),@PullDown=IsNull(PullDown,0),@Mark=Mark From  Active_Number Where ActiveID=@ActiveID And AwardID =@AwardID
     If @ActiveID=0 or @PullDown Is Null /*验证AwardID*/
        Begin
          Return 10
     End
     If @PullDown=1
        Begin
          Return 6
        End
   End
Else If @HasKey=3
   Begin
     Set @AwardID = cast(@ActiveID as nvarchar(20)) + '-3-' + cast(@UserID as nvarchar(20))
     --验证AwardID
     Select @PullDown=IsNull(PullDown,0),@Mark=IsNull(Mark,0) From  Active_Number Where ActiveID=@ActiveID and AwardID =@AwardID
     If @PullDown<>0 or @PullDown Is Not Null
     Begin
       Return 6
     End
   End
Else If @HasKey=4
   Begin
     Select @ActiveID=Isnull(ActiveID,0),@PullDown=Isnull(PullDown,0),@Mark=Mark From  Active_Number Where ActiveID=@ActiveID and AwardID =@AwardID
      If @ActiveID=0 or @PullDown is null /*验证AwardID*/
         Begin
           Return 4
         End
      If @PullDown=1
         Begin
           Return 5
         End
   End
Else
   Begin
     Return 1
   End

--第二步：验证用户
Declare @temp Int
Declare @maxCount Int
Declare @NickName NVarchar(50)
Declare @sex Int
Set @NickName=''
Select @NickName=NickName,@sex=(Case sex When 0 Then 2 Else 1 End) From  Sys_Users_Detail Where UserID = @UserID
If @NickName = '' or @NickName Is Null
   Begin
     Return 2
   End

--第三步：验证物品
If object_id('tempdb..#Award') Is Not Null 
Drop Table #Award 
Create Table #Award 
( 
  id Int Identity(1,1), 
  TemplateID Int Not Null,
  [Count] Int Not Null,
  ValidDate Int Not Null,
  StrengthenLevel Int Not Null,
  AttackCompose Int Not Null,
  DefendCompose Int Not Null,
  LuckCompose Int Not Null,
  AgilityCompose Int Not Null,
  Gold Int Not Null,
  [Money] Int Not Null
) 

Insert Into #Award Select ItemID,[Count],ValidDate,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,Gold,[Money] From [Project_Game34].[dbo].Active_Award Where ActiveID=@ActiveID And (Sex=@sex Or Sex=0) And Mark=@Mark
If @@error<>0
   Begin
     Return 7   
   End

Declare @Index Int
Declare @ItemCount Int
Set @Index = 1
Select @ItemCount=count(*) From  #Award

--第四步：用户领引物品，以邮件的方式发送给用户
Declare @ItemID Int      /*定义物品属性*/
Declare @TemplateID Int
Declare @Place Int
Declare @Count Int
Declare @IsJudge Bit
Declare @Color Nvarchar(100)
Declare @IsExist Bit
Declare @StrengthenLevel Int
Declare @AttackCompose Int
Declare @DefendCompose Int
Declare @LuckCompose   Int
Declare @AgilityCompose Int
Declare @IsBinds Bit
Declare @BeginDate DateTime
Declare @ValidDate Int
Declare @BagType   Int
Set @ItemID = 0
Set @TemplateID =0 
Set @Place =-1
Set @Count =1
Set @IsJudge =1 
Set @Color =''
Set @IsExist =1 
Set @StrengthenLevel =0 
Set @AttackCompose =0
Set @DefendCompose =0
Set @LuckCompose =0
Set @AgilityCompose =0
Set @IsBinds =1
Set @BeginDate =GetDate()
Set @ValidDate =0
Set @BagType =0
Declare @SenderID Int    /*定义邮箱格式*/
Declare @Sender Nvarchar(100)
Declare @ReceiverID Int
Declare @Receiver Nvarchar(100)
Declare @Title Nvarchar(1000)
Declare @Content Nvarchar(4000)
Declare @SendTime DateTime
Declare @IsRead Bit
Declare @IsDelR Bit
Declare @IfDelS Bit
Declare @IsDelete Bit
Declare @Annex1 Nvarchar(100)
Declare @Annex2 Nvarchar(100)
Declare @Gold Int
Declare @Money Int
Declare @Remark Nvarchar(200)
Declare @Annex3 Nvarchar(100)
Declare @Annex4 Nvarchar(100)
Declare @Annex5 Nvarchar(100)
Declare @AnnexIndex Int
Set @SenderID =0
Set @Sender = Dbo.GetTranslation('SP_Active_PullDown.Sender')--'系统管理员' 
Set @ReceiverID = @UserID
Set @Receiver = @NickName
Set @Title = Dbo.GetTranslation('SP_Active_PullDown.Title')--'您获得活动奖品!'
Set @Content = Dbo.GetTranslation('SP_Active_PullDown.Content')--'您获得活动奖品!'
Set @SendTime  = GetDate()
Set @IsRead  = 0
Set @IsDelR = 0
Set @IfDelS = 0
Set @IsDelete =0
Set @Annex1 =''
Set @Annex2 =''
Set @Gold =0
Set @Money =0
Set @Annex3 =''
Set @Annex4 =''
Set @Annex5 =''
Set @AnnexIndex=0
Set xact_abort On 
    Begin Tran
      While @Index<=@ItemCount
         Begin
           Select @TemplateID=TemplateID,@Count=[Count],@ValidDate=ValidDate,@StrengthenLevel=StrengthenLevel,@AttackCompose=AttackCompose,@DefendCompose=DefendCompose,@LuckCompose=LuckCompose,@AgilityCompose=AgilityCompose,@Gold=@Gold+Gold,@Money=@Money+[Money] From #Award Where [id]=@Index
           Set @temp =0
           Select @temp=isnull(TemplateID,0),@maxCount=isnull(MaxCount,1) from [Project_Game34].[dbo].Shop_Goods where TemplateID = @TemplateID
           If @temp = 0 and @TemplateID<>0
              Begin
                Rollback Tran
                Return 3
              End
           If @TemplateID <>0
              Begin
                Declare @getCount Int
                While @Count > 0
                   Begin
                     Set @AnnexIndex = @AnnexIndex+1
                     If @Count > @maxCount
                        Begin
                          Set @getCount = @maxCount
                        End
                     Else
                        Begin
                          Set @getCount = @Count
                        End
                     Set @Count = @Count-@getCount
                     Insert Into Sys_Users_Goods( UserID, BagType,TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate,IsUsed) 
							Values( 0, @BagType,@TemplateID, @Place, @getCount, @IsJudge, @Color, @IsExist, @StrengthenLevel, @AttackCompose, @DefendCompose, @LuckCompose, @AgilityCompose, @IsBinds, @BeginDate, @ValidDate,0)
					 Select @@identity As 'identity'
                     Set @ItemID=@@identity    
					 If @@error<>0
                        Begin
                          Rollback Tran
                          Return @@error
                        End
					 If @AnnexIndex=1
						Begin
						  Set @Annex1=Cast(@ItemID As NVarchar(20))
						End
					 If @AnnexIndex=2
						Begin
						  Set @Annex2=Cast(@ItemID As NVarchar(20))
						End
					 If @AnnexIndex=3
						Begin
						  Set @Annex3=Cast(@ItemID As NVarchar(20))
						End
					 If @AnnexIndex=4
						Begin
						  Set @Annex4=Cast(@ItemID As NVarchar(20))
						End
					 If @AnnexIndex=5
						Begin
						  Set @Annex5=Cast(@ItemID As Nvarchar(20))
						  Set @Remark = 'GiftToken:0,Money:0,Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5
                          Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, [GiftToken], Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
								 Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, 0, 0, @IsExist,52,@Remark,@Annex3,@Annex4,@Annex5)
					      If @@error<>0
							 Begin  
							   Rollback Tran
							   Return @@error
							 End
						  Set @AnnexIndex=0
						  Set @Annex1 =''
						  Set @Annex2 =''
						  Set @Annex3 =''
						  Set @Annex4 =''
						  Set @Annex5 =''
						End
              End
         end
      Set @index = @index+1
    End

If @AnnexIndex<>0 Or  @Gold>0 Or @Money>0
   Begin
     If @AnnexIndex=4
		Begin
		Set @Remark = 'GiftToken:0,Money:'+Cast(@Money As Nvarchar(20))+',Annex1:,Annex2:,Annex3:,Annex4:,Annex5:'
		Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, GiftToken, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
			   Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, '', '', '', @Money, @IsExist,52,@Remark,'','','') 
	If @@error<>0
		Begin  
		  Rollback tran
		  Return @@error
		End 
    Set @Money=0
  End
  Set @Remark = 'GiftToken:'+cast(@Gold as Nvarchar(20))+',Money:'+cast(@Money as Nvarchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5
  Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, GiftToken, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
         Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,52,@Remark,@Annex3,@Annex4,@Annex5)
  If @@error<>0
   	 Begin  
       Rollback Tran
	   Return @@error
	 End  
  End

  If @HasKey <> 3
	 Begin
       Update Active_Number Set PullDown=1,[GetDate]=getdate(),UserID=@UserID Where AwardID = @AwardID
       If @@error<>0
		  Begin  
			Rollback Tran
			Return @@error
		  End
	   End
	Else
	  Begin
		Insert Into Active_Number(AwardID,ActiveID,PullDown,[GetDate],UserID,Mark)
			   Values(@AwardID,@ActiveID,1,Getdate(),@UserID,0)
		If @@error<>0
		   Begin  
			 Rollback Tran
			 Return @@error
		   End
      End
  Commit Tran
  Set xact_abort Off
  Return 0







GO
