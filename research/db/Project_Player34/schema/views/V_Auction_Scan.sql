-- VIEW dbo.V_Auction_Scan (modified 2020-12-11T12:41:32.910)
CREATE VIEW [dbo].[V_Auction_Scan]
AS
SELECT dbo.Auction.*, DATEADD(hh, ValidDate, BeginDate) AS dd
FROM dbo.Auction
WHERE (DATEADD(mi, Random, BeginDate) < GETDATE())



GO
