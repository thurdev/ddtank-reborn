-- VIEW dbo.Ddt_Auction_View (modified 2012-04-21T07:53:24.653)
CREATE VIEW [dbo].[Ddt_Auction_View]
AS
SELECT AuctionID as ID, AuctioneerName, Name, Price, Rise, Mouthful, BeginDate, ValidDate, 
      BuyerName, IsExist
FROM Db_Tank_Copy.dbo.Auction




GO
