-- SQL_STORED_PROCEDURE dbo.SP_Admin_SendAllItem_UserID (modified 2021-06-04T05:18:34.570)


-- =============================================
-- Author:		<Ken，Xiaov>
-- ALTER  date: <2009-10-22>
-- Description:	<后台赠送物品：新版GM后台使用>
-- =============================================
CREATE  Procedure [dbo].[SP_Admin_SendAllItem_UserID]
 @Title nvarchar(1000), 
 @Content nvarchar(2000), 
 @UserID int, 
 @Gold int, 
 @Money int, 
 @GiftToken int,
 --@ParamHole nvarchar(2000),
 @Param nvarchar(2000)
 --@Hole1 int, @Hole2 int, @Hole3 int, @Hole4 int, @Hole5 int, @Hole6 int
As 

/*第一步：设置User信息*/
Declare @NickName varchar(50)
Set @NickName=''
Select @NickName=NickName, @UserID=UserID from  Sys_Users_Detail where UserID = @UserID
If @NickName = ''
   Begin
     Return 2
   End

/*第二步：设置物品信息*/
Declare @Hole1 int 
Declare @Hole2 int
Declare @Hole3 int
Declare @Hole4 int
Declare @Hole5 int
Declare @Hole6 int

Declare @temp int
Declare @maxCount int
Declare @ItemID int
Declare @TemplateID int
Declare @Place int
Declare @Count int
Declare @IsJudge bit
Declare @Color nvarchar(100)
Declare @IsExist bit
Declare @StrengthenLevel int
Declare @AttackCompose int
Declare @DefendCompose int
Declare @LuckCompose int
Declare @AgilityCompose int
Declare @IsBinds bit
Declare @BeginDate DateTime
Declare @ValidDate int
Declare @BagType int
Set @BeginDate=getdate()
Set @Place=-1
Set @IsJudge =1
Set @Color=''
Set @IsExist=1
Set @BagType=-1

/*第三步:设置邮件信息*/
Declare @SenderID int
Declare @Sender nvarchar(100)
Declare @ReceiverID int
Declare @Receiver nvarchar(100)
Declare @SendTime DateTime
Declare @IsRead bit
Declare @IsDelR bit
Declare @IfDelS bit
Declare @IsDelete bit
Declare @Annex1 nvarchar(100)
Declare @Annex2 nvarchar(100)
Declare @Remark nvarchar(200)
Declare @Annex3 nvarchar(100)
Declare @Annex4 nvarchar(100)
Declare @Annex5 nvarchar(100)
Declare @AnnexIndex int
Set @SenderID =0
Set @Sender = N'Hệ thống' --dbo.GetTranslation('SP_Active_PullDown.Sender')--'系统管理员' 
Set @ReceiverID = @UserID
Set @Receiver = @NickName
Set @SendTime  = getdate()
Set @IsRead  = 0
Set @IsDelR = 0
Set @IfDelS = 0
Set @IsDelete =0
Set @Annex1 =''
Set @Annex2 =''
Set @Annex3 =''
Set @Annex4 =''
Set @Annex5 =''
Set @AnnexIndex=0
Declare @locationItem int
Declare @startItem int
Declare @values nvarchar(200)
Declare @locationValue int
Declare @startValue int
Declare @value nvarchar(200)
Declare @indexValue int
Set @Param=ltrim(rtrim(@Param))
Set @startItem=1


/*第四步：循环发邮件*/
Set Xact_Abort On 
Begin Tran
If len(@Param)>0
  Begin
    Set @Param=@Param+'|'
    Set @locationItem=charindex('|',@Param)
    while @locationItem<>0
          Begin
            Set @values=substring(@Param,@startItem,@locationItem-@startItem)
            Set @startItem=@locationItem+1
            Set @indexValue=0   

            --templateID,count,validDate,StrengthenLevel,AttackCompose,DefendCompose,AgilityCompose,LuckCompose,isBinds
            Set @values=ltrim(rtrim(@values))
            Set @values = @values+','
            Set @locationValue=charindex(',',@values)

            Set @ItemID =0
            Set @TemplateID =0 
            Set @Count =0
            Set @StrengthenLevel =0
            Set @AttackCompose =0
            Set @DefendCompose =0
            Set @LuckCompose =0
            Set @AgilityCompose =0
            Set @IsBinds =1
            Set @ValidDate =1

            Set @startValue=1
            While @locationValue<>0
                  Begin
                    Set @indexValue = @indexValue+1
                    Set @value=substring(@values,@startValue,@locationValue-@startValue)
                    Set @startValue=@locationValue+1

                    If @indexValue=1
                       Begin
                         Set @TemplateID=@value
                       End
                    Else If @indexValue=2
                       Begin
                         Set @Count=@value
                       End
                    Else If @indexValue=3
                       Begin
                         set @ValidDate=@value
                       End
                    Else If @indexValue=4
                       Begin
                         Set @StrengthenLevel=@value
                       End
                    Else If @indexValue=5
                       Begin
                         Set @AttackCompose=@value
                       End
                    Else If @indexValue=6
                       Begin
                         Set @DefendCompose=@value
                       End
                    Else If @indexValue=7
                       Begin
                         Set @AgilityCompose=@value
                       End
                    Else If @indexValue=8
                       Begin
                         Set @LuckCompose=@value
                       End
                    Else If @indexValue=9
                       Begin
                         Set @IsBinds=@value
                       End	
    	            Set @locationValue=charindex(',',@values,@startValue)	
                  End

            --数量拆分
            Set @temp = 0
            Select @temp=isnull(TemplateID,0),@maxCount=isnull(MaxCount,1) from Shop_Goods where TemplateID = @TemplateID
            If @temp = 0
               Begin
                 Set @TemplateID = 0
               End
            If @TemplateID <>0
               Begin
                 declare @getCount int
                 While @Count > 0
                       Begin   
                         If @Count > @maxCount
                            Begin
                              Set @getCount = @maxCount
                            End
                         Else
                            Begin
                              Set @getCount = @Count
                            End
                         Set @Count = @Count-@getCount
                         Set @AnnexIndex = @AnnexIndex+1
                         
                        Set @Hole1 =-1
						Set @Hole2 =-1
						Set @Hole3 =-1
						Set @Hole4 =-1
						Set @Hole5 =-1
						Set @Hole6 =-1
                         --/*-----
                         declare @Categ int
                         Select @Categ =isnull(CategoryID,0) from Shop_Goods where TemplateID = @TemplateID
                         If @Categ=1 or @Categ=5 or @Categ=7
                            Begin
                            Set @Hole1 =0
							Set @Hole2 =0
							Set @Hole3 =0
							Set @Hole4 =0
							Set @Hole5 =0
							Set @Hole6 =0
                            End
                           
                          --*/----- 
                          
                         Insert Into Sys_Users_Goods( UserID, BagType,TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate, Hole1, Hole2, Hole3, Hole4, Hole5, Hole6) 
                                Values( 0, @BagType,@TemplateID, @Place, @getCount, @IsJudge, @Color, @IsExist, @StrengthenLevel, @AttackCompose, @DefendCompose, @LuckCompose, @AgilityCompose, @IsBinds, @BeginDate, @ValidDate, @Hole1, @Hole2, @Hole3, @Hole4, @Hole5, @Hole6)
                         Select @@identity as 'identity'
                         Set @ItemID=@@identity    
                         If @@error<>0
                            Begin
                              Rollback tran
                              Return @@error
                            End
                         If @AnnexIndex=1
                            Begin
                              Set @Annex1=cast(@ItemID as varchar(20))
                            End
                         If @AnnexIndex=2
                            Begin
                              Set @Annex2=cast(@ItemID as varchar(20))
                            End
                         If @AnnexIndex=3
                            Begin
                              Set @Annex3=cast(@ItemID as varchar(20))
                            End
                         If @AnnexIndex=4
                            Begin
                              Set @Annex4=cast(@ItemID as varchar(20))
                            End
                         If @AnnexIndex=5
                            Begin
                              Set @Annex5=cast(@ItemID as varchar(20))
                              Set @Remark = 'Gold:0,Money:0,Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5+',GiftToken:0'
                              Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5,GiftToken) 
                                     Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, 0, 0, @IsExist,51,@Remark,@Annex3,@Annex4,@Annex5,0)
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
               End
               Set @locationItem=charindex('|',@Param,@startItem)
          End
  End
 
/*第五步：发最后一封邮件*/
If  (@AnnexIndex<>0) And (len(@Param) <> 0 )
    Begin
     Set @Remark = 'Gold:0,Money:0,Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5+',GiftToken:0'
     Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5,GiftToken) 
            Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, 0,0, @IsExist,51,@Remark,@Annex3,@Annex4,@Annex5,0)
     If @@error<>0
        Begin  
          Rollback tran
          Return @@error
        End
    End

If(@Gold>0 or @Money>0 or @GiftToken>0)
  Begin
    Set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:,Annex2:,Annex3:,Annex4:,Annex5:,GiftToken:'+cast(@GiftToken as varchar(20))
    Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5,GiftToken) 
           VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, '', '', @Gold, @Money, @IsExist,51,@Remark,'','','',@GiftToken) 
    If @@error<>0
       Begin  
         Rollback tran
         Return @@error
       End
  End


Commit Tran
Set xact_abort off
 

If @AnnexIndex<>0 or  @Gold>0 or @Money>0 or @GiftToken>0
   Begin
     If @AnnexIndex=4 and @Gold>0 and @Money>0 and @GiftToken>0
        Begin
          return
          Set @Remark = 'Gold:0,Money:'+cast(@Money as varchar(20))+',Annex1:,Annex2:,Annex3:,Annex4:,Annex5:'
          print @Remark

          INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
                 VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, '', '', 0, @Money, @IsExist,51,@Remark,'','','') 
          If @@error<>0
             Begin  
               Rollback tran
               Return @@error
             End
          Set @Money=0
          Set @GiftToken=0
        End
     Set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5+',GiftToken'+@GiftToken
     Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5,GiftToken) 
            Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,51,@Remark,@Annex3,@Annex4,@Annex5,@GiftToken)
     print '3'
     If @@error<>0
        Begin  
          Rollback tran
          Return @@error
        End  
   End
   Else If len(@Param) = 0 
        Begin
          Set @Remark = 'Gold:0,Money:0,Annex1:,Annex2:,Annex3:,Annex4:,Annex5:,GiftToken:0'
          Insert Into User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,Annex3,Annex4,Annex5) 
                 Values( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, 0, 0, @IsExist,51,@Remark,@Annex3,@Annex4,@Annex5)
          If @@error<>0
             Begin  
               Rollback tran
               Return @@error
             End
        End
Commit Tran
Set xact_abort off
Return 0




GO
