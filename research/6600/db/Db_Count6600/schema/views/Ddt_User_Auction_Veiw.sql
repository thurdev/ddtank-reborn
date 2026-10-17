-- VIEW dbo.Ddt_User_Auction_Veiw (modified 2011-04-13T00:53:18.797)

Create VIEW [dbo].[Ddt_User_Auction_Veiw]
AS
SELECT  Cast('' As Varchar(20) ) As    AuctionObject,
        Cast(0 As Int) as   AuctionID,
        Cast('' As Varchar(100)) As Name,
        Cast(0 As Int)As  Category,
        Cast(0 As Int)As  AuctioneerID,
        Cast('' As Varchar(100))As  AuctioneerName,
        Cast(0 As Int) As ItemID, 
        Cast('' As varchar(10)) As PayStatic,
        Cast(0 As Int) As Price,
        Cast(0 As Int) As  Rise,
        Cast(0 As Int) As  Mouthful,
        Cast('2009-01-01' As DateTime) As BeginDate,
        Cast(0 As Int) As ValidDate,
        Cast(0 As Int) BuyerID, 
        Cast('' As Varchar(20)) As BuyerName, 
        Cast('' As varchar(10)) As  ExistStatic


GO
