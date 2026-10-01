-- SQL_STORED_PROCEDURE dbo.SP_Auction_Delete (modified 2021-06-04T05:18:34.720)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户取消拍卖>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Auction_Delete]
 @AuctionID int,
 @UserID int

AS  

declare @AuctioneerID int
declare @AuctioneerName nvarchar(100)
declare @BuyerID int
declare @BuyerName nvarchar(100)
declare @ItemID int
declare @PayType int
declare @Price int


--信箱
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

set @SenderID =0
set @Sender = dbo.GetTranslation('SP_Auction_Delete.Sender')--'弹弹堂拍卖中心' 
set @ReceiverID = ''
set @Receiver = ''
set @Title = dbo.GetTranslation('SP_Auction_Delete.Title')--'撤消拍卖!'
set @Content = dbo.GetTranslation('SP_Auction_Delete.Content')--'撤消拍卖!'
set @SendTime  = getdate()
set @IsRead  = 0
set @IsDelR = 0
set @IfDelS = 0
set @IsDelete =0
set @Annex1 =''
set @Annex2 =''
set @Gold =0
set @Money =0

select @AuctionID=AuctionID,@AuctioneerID=AuctioneerID,@AuctioneerName=AuctioneerName,@BuyerID=BuyerID,@BuyerName=BuyerName,@ItemID=ItemID,@Price=Price,@PayType=PayType
from Auction where AuctionID=@AuctionID and IsExist = 1 and AuctioneerID = @UserID

if @AuctioneerID is null
begin
  return 1 
end

if @BuyerID<>0
begin
  return 2
end

set xact_abort on 
begin tran

  update Auction set IsExist=0 where AuctionID=@AuctionID 
 
  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 3 
   end
     set @Remark = 'Gold:0,Money:0,Annex1:'+cast(@ItemID as varchar(20))+',Annex2:'+@Annex2
        INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, [Money], IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @AuctioneerID, @AuctioneerName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @ItemID, @Annex2, 0, 0, 1,3,@Remark)
    
     if @@error<>0  
       begin
        rollback tran
        return 4 
       end    

commit tran
set xact_abort off
return 0



GO
