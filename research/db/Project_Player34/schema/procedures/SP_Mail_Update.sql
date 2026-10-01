-- SQL_STORED_PROCEDURE dbo.SP_Mail_Update (modified 2022-08-07T06:34:43.187)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：用户查阅邮件后，取出相关的附件>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_Mail_Update]   
 @ID int, 
 @SenderID int, 
 @Sender nvarchar(100), 
 @ReceiverID int, 
 @Receiver nvarchar(100), 
 @Title nvarchar(1000), 
 @Content nvarchar(4000), 
 @SendTime DateTime, 
 @IsRead bit, 
 @IsDelR bit, 
 @IfDelS bit, 
 @IsDelete bit, 
 @Annex1 nvarchar(100), 
 @Annex2 nvarchar(100), 
 @Gold int, 
 @Money int, 
 @IsExist bit,
 @Type int,
 @OldMoney int,
 @ValidDate int,
 @Annex1Name nvarchar(100), 
 @Annex2Name nvarchar(100),
 @Annex3 nvarchar(100), 
 @Annex4 nvarchar(100), 
 @Annex5 nvarchar(100), 
 @Annex3Name nvarchar(100), 
 @Annex4Name nvarchar(100),
 @Annex5Name nvarchar(100),
 @GiftToken  int
AS  

set xact_abort on 
begin tran


if @Type>100 and @Money<>@OldMoney
begin
  set @ValidDate=72
  declare @Remark nvarchar(200)
  declare @NewTitle nvarchar(200)
  declare @NewContent nvarchar(200)
  declare @AnnexRemark nvarchar(200)
  set @NewTitle = dbo.GetTranslation('SP_Mail_Update.Msg1')+@Title--'付款信函:    '+@Title
  --付款信函内容改为"你寄往<对方玩家>的<物品>已经付费，付费金额为<数量>点券"
  if @Annex2Name is not null and @Annex2Name<>''
    begin
	if @Annex1Name is not null and @Annex1Name<>''
	begin
	 set @Annex1Name=@Annex1Name + ','
	end
       set @Annex1Name = @Annex1Name +@Annex2Name
    end
  if @Annex3Name is not null and @Annex3Name<>''
    begin
	if @Annex1Name is not null and @Annex1Name<>''
	begin
	 set @Annex1Name=@Annex1Name + ','
	end
       set @Annex1Name = @Annex1Name + @Annex3Name
    end
  if @Annex4Name is not null and @Annex4Name<>''
    begin
	if @Annex1Name is not null and @Annex1Name<>''
	begin
	 set @Annex1Name=@Annex1Name + ','
	end
       set @Annex1Name = @Annex1Name +@Annex4Name
    end
  if @Annex5Name is not null and @Annex5Name<>''
    begin
	if @Annex1Name is not null and @Annex1Name<>''
	begin
	 set @Annex1Name=@Annex1Name + ','
	end
       set @Annex1Name = @Annex1Name +@Annex5Name
    end

  set @NewContent =dbo.GetTranslation('SP_Mail_Update.Msg2')--'您寄往<'+ @Receiver +'>的  '+ @Annex1Name +'  已经付费，付款金额为'+cast(@OldMoney as varchar(20))+'点券!'
  set @NewContent = REPLACE(@NewContent,'{0}',@Receiver)
  set @NewContent = REPLACE(@NewContent,'{1}',@Annex1Name)
  set @NewContent = REPLACE(@NewContent,'{2}',cast(CAST(ROUND(@OldMoney*0.9,0) as INT) as varchar(20)))
  set @Remark = 'Gold:0,Money:'+cast(CAST(ROUND(@OldMoney*0.9,0) as INT) as varchar(20))+',Annex1:,Annex2:,Annex3:,Annex4:,Annex5:GiftToken:0'
  set @AnnexRemark =dbo.GetTranslation('SP_Mail_Update.Msg3')--'附件为：1、点券{0}'
  set @AnnexRemark = REPLACE(@AnnexRemark,'{0}',cast(@OldMoney*0.9 as varchar(20)))
  INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,AnnexRemark) 
       VALUES( @ReceiverID, @Receiver, @SenderID, @Sender, @NewTitle, @NewContent, getdate(), 0, 0, 0, 0, '', '', 0, @OldMoney*0.9, 1,6,@Remark,@AnnexRemark)

  if @@error <>0
  begin 
    rollback tran
    return @@error
  end

end


UPDATE User_Messages Set SenderID=@SenderID, Sender=@Sender, ReceiverID=@ReceiverID, Receiver=@Receiver, Title=@Title, Content=@Content, SendTime=@SendTime, IsRead=@IsRead, IsDelR=@IsDelR, IfDelS=@IfDelS, IsDelete=@IsDelete, Annex1=@Annex1, Annex2=@Annex2, Gold=@Gold, Money=@Money, IsExist=@IsExist ,ValidDate=@ValidDate, Annex3=@Annex3, Annex4=@Annex4, Annex5=@Annex5,GiftToken=@GiftToken
where ID=@ID and ReceiverID=@ReceiverID

if @@error <>0
begin 
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0







GO
