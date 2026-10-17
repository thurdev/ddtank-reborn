-- SQL_STORED_PROCEDURE dbo.SP_Auction_Single (modified 2015-01-25T14:04:48.510)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：读取一条拍卖商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Auction_Single]   
 @AuctionID int
AS  

   begin 
     select * from Auction WHERE AuctionID=@AuctionID and IsExist = 1
   end

GO
