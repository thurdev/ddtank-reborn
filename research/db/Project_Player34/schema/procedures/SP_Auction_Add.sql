-- SQL_STORED_PROCEDURE dbo.SP_Auction_Add (modified 2021-06-04T05:18:34.707)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Auction_Add]   
 @AuctionID int output, 
 @AuctioneerID int, 
 @AuctioneerName nvarchar(100), 
 @BeginDate DateTime, 
 @BuyerID int, 
 @BuyerName nvarchar(100), 
 @IsExist bit, 
 @ItemID int, 
 @Mouthful int, 
 @PayType int, 
 @Price int, 
 @Rise int, 
 @ValidDate int,
 @TemplateID int,
 @Name nvarchar(200),
 @Category int,
 @Random int,
 @goodsCount int
AS  
    Set @ValidDate=1+@ValidDate
     INSERT INTO Auction( AuctioneerID,[Name],Category,AuctioneerName, BeginDate, BuyerID, BuyerName, IsExist, ItemID, Mouthful, PayType, Price, Rise, ValidDate,TemplateID,Random,goodsCount) 
     VALUES( @AuctioneerID,@Name,@Category,@AuctioneerName, @BeginDate, @BuyerID, @BuyerName, @IsExist, @ItemID, @Mouthful, @PayType, @Price, @Rise, @ValidDate, @TemplateID,0,@goodsCount)
     select @@identity as 'identity'
     set @AuctionID=@@identity







GO
