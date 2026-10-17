-- VIEW dbo.V_Auction_Scan (modified 2011-08-02T08:26:28.670)
CREATE VIEW dbo.V_Auction_Scan
AS
SELECT dbo.Auction.*, DATEADD(hh, ValidDate, BeginDate) AS dd
FROM dbo.Auction
WHERE (DATEADD(mi, Random, BeginDate) < GETDATE())

GO
