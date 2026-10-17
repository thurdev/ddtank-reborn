-- VIEW dbo.V_Auction (modified 2011-08-02T08:26:29.183)


CREATE VIEW dbo.V_Auction
AS
SELECT *, DATEADD(hh, ValidDate, BeginDate) AS dd
FROM dbo.Auction



GO
