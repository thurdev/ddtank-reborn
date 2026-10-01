-- VIEW dbo.V_Auction (modified 2020-12-11T12:41:32.910)


CREATE VIEW [dbo].[V_Auction]
AS
SELECT *, DATEADD(hh, ValidDate, BeginDate) AS dd
FROM dbo.Auction





GO
