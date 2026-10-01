-- SQL_STORED_PROCEDURE dbo.SP_Mail_ScanTwo (modified 2021-06-04T05:18:35.570)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：新版扫描用户付费邮件>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Mail_ScanTwo]
 @NoticeUserID nvarchar(4000) output

AS  
set @NoticeUserID=''
declare @AuctionID int
declare @AuctioneerID int
declare @AuctioneerName nvarchar(100)
declare @BuyerID int
declare @BuyerName nvarchar(100)
declare @ItemID int
declare @PayType int
declare @Price int
declare @Name nvarchar(200)


--娣囷紕顔?
declare @MailID int
declare @SenderID int
declare @Sender nvarchar(100)
declare @ReceiverID int
declare @Receiver nvarchar(100)
declare @Title nvarchar(1000)
declare @Content nvarchar(4000)
declare @SendTime DateTime
declare @IsRead bit
declare @IsDelR bit
declare @IfDelS bit
declare @IsDelete bit
declare @Annex1 nvarchar(100)
declare @Annex2 nvarchar(100)
declare @Gold int
declare @Money int
declare @Remark nvarchar(200)
declare @Annex3 nvarchar(100)
declare @Annex4 nvarchar(100)
declare @Annex5 nvarchar(100)


set @SenderID =0
set @Sender =dbo.GetTranslation('SP_Mail_Scan.Sender')--'瀵懓鑴婇崼鍌涘閸楁牔鑵戣箛? 
set @ReceiverID = ''
set @Receiver = ''
set @Title =dbo.GetTranslation('SP_Mail_Scan.Title')--'閹峰秴宕犻幋鎰!'
set @Content =dbo.GetTranslation('SP_Mail_Scan.Content')--'閹峰秴宕犻幋鎰!'
set @SendTime  = getdate()
set @IsRead  = 0
set @IsDelR = 0
set @IfDelS = 0
set @IsDelete =0
set @Annex1 =''
set @Annex2 =''
set @Gold =0
set @Money =0
set @Annex3 =''
set @Annex4 =''
set @Annex5 =''

if object_id('tempdb..#PayMail') is not null
drop table #PayMail 

create table #PayMail 
( 
id int identity(1,1), 
MailID int not null,
SenderID int not null,
Sender nvarchar(200) not null,
ReceiverID int not null,
Receiver nvarchar(200) not null,
Title nvarchar(1000) not null,
Annex1 nvarchar(100) not null,
Annex2 nvarchar(100) not null,
Annex3 nvarchar(100) not null,
Annex4 nvarchar(100) not null,
Annex5 nvarchar(100) not null,
) 

insert into #PayMail select [ID],SenderID,Sender,ReceiverID,Receiver,Title,isnull(Annex1,''),isnull(Annex2,''),isnull(Annex3,''),isnull(Annex4,''),isnull(Annex5,'') from User_Messages 
where IsExist=1 and Type>100 and datediff(hh,SendTime,getdate())>ValidDate and [Money]>0

  declare @NewTitle nvarchar(200)
  declare @NewContent nvarchar(200)
  set @NewTitle = dbo.GetTranslation('SP_Mail_Scan.Msg1')--'闁偓閸ョ偘淇婇崙?    '+@Title
  set @NewContent =dbo.GetTranslation('SP_Mail_Scan.Msg2')--'閹劌鐦庡鈧?'+ @Receiver +'>閻ㄥ嫰鍋栨禒鍓佹暠娴滃骸顕弬瑙勫珕缂佹繃甯撮弨鑸靛灗鐡掑懓绻冮柇顔绘娣囨繄鏆€閺堢喕鈧矁顫﹂柅鈧崶?'
 
set xact_abort on 
  begin tran

INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark, Annex3, Annex4, Annex5) 
      select ReceiverID,Receiver,SenderID,Sender,@NewTitle,REPLACE(@NewContent,'{0}',Receiver),getdate(), 0, 0, 0, 0,Annex1,Annex2,0,0,1,7,'Gold:0,Money:0,Annex1:'+Annex1+',Annex2:'+Annex2+',Annex3:'+Annex3+',Annex4:'+Annex4+',Annex5:'+Annex5,Annex3,Annex4,Annex5
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
