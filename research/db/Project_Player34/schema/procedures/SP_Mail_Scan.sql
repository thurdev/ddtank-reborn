-- SQL_STORED_PROCEDURE dbo.SP_Mail_Scan (modified 2021-06-04T05:18:35.557)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：旧版扫描付费邮件，将过期的付费邮件返回给相应的用户，以邮件的方式返回>
-- =============================================
CREATE    PROCEDURE [dbo].[SP_Mail_Scan]
 @NoticeUserID nvarchar(4000) output

AS  
Set @NoticeUserID=''
Declare @AuctionID Int        
Declare @AuctioneerID Int
Declare @AuctioneerName Nvarchar(100)
Declare @BuyerID Int
Declare @BuyerName Nvarchar(100)
Declare @ItemID Int
Declare @PayType Int
Declare @Price Int
Declare @Name Nvarchar(200)


--定义邮件字段
Declare @MailID Int
Declare @SenderID Int
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


Set @SenderID =0
Set @Sender =dbo.GetTranslation('SP_Mail_Scan.Sender')  --
Set @ReceiverID = ''
Set @Receiver = ''
Set @Title =dbo.GetTranslation('SP_Mail_Scan.Title')--'閹峰秴宕犻幋鎰!'
Set @Content =dbo.GetTranslation('SP_Mail_Scan.Content')--'閹峰秴宕犻幋鎰!'
Set @SendTime  = getdate()
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

If object_id('tempdb..#PayMail') Is Not null
Drop Table #PayMail 

Create Table #PayMail 
(
id Int Identity(1,1), 
MailID Int Not Null,
SenderID Int Not Null,
Sender Nvarchar(200) Not null,
ReceiverID Int not null,
Receiver Nvarchar(200) not null,
Title Nvarchar(1000) not null,
Annex1 Nvarchar(100) not null,
Annex2 Nvarchar(100) not null,
Annex3 Nvarchar(100) not null,
Annex4 Nvarchar(100) not null,
Annex5 Nvarchar(100) not null,
) 
 
insert into #PayMail select [ID],SenderID,Sender,ReceiverID,Receiver,Title,isnull(Annex1,''),isnull(Annex2,''),isnull(Annex3,''),isnull(Annex4,''),isnull(Annex5,'') from User_Messages with(nolock) 
where IsExist=1 and Type>100 and datediff(hh,SendTime,getdate())>ValidDate and [Money]>0

  declare @NewTitle nvarchar(200)
  declare @NewContent nvarchar(200)
  set @NewTitle = dbo.GetTranslation('SP_Mail_Scan.Msg1')--'闁偓閸ョ偘淇婇崙?    '+@Title
  set @NewContent =dbo.GetTranslation('SP_Mail_Scan.Msg2')--'閹劌鐦庡鈧?'+ @Receiver +'>閻ㄥ嫰鍋栨禒鍓佹暠娴滃骸顕弬瑙勫珕缂佹繃甯撮弨鑸靛灗鐡掑懓绻冮柇顔绘娣囨繄鏆€閺堢喕鈧矁顫﹂柅鈧崶?'
 
set xact_abort on 
  begin tran

INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark, Annex3, Annex4, Annex5) 
      select ReceiverID,Receiver,SenderID,Sender,@NewTitle+Title,REPLACE(@NewContent,'{0}',Receiver),getdate(), 0, 0, 0, 0,Annex1,Annex2,0,0,1,7,'Gold:0,Money:0,Annex1:'+Annex1+',Annex2:'+Annex2+',Annex3:'+Annex3+',Annex4:'+Annex4+',Annex5:'+Annex5,Annex3,Annex4,Annex5
 	from #PayMail

  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 1 
   end

  update User_Messages set IsExist=0,@NoticeUserID = @NoticeUserID + cast(SenderID as nvarchar(50)) + ',' from User_Messages where [ID] in (select MailID from #PayMail)

  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 1 
   end

  commit tran
set xact_abort off

if len(@NoticeUserID)>0
begin
 set @NoticeUserID = substring(@NoticeUserID,1,len(@NoticeUserID)-1)
end
--set @NoticeUserID='100,200'

return 0











GO
