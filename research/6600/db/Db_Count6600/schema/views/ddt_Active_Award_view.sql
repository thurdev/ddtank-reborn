-- VIEW dbo.ddt_Active_Award_view (modified 2012-04-21T07:53:24.640)
CREATE VIEW [dbo].[ddt_Active_Award_view]
AS
SELECT     TOP 0 ID, ActiveID, ItemID, Count, ValidDate, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, Gold, Money, Sex, 
                      Mark, CAST('' AS Varchar(30)) AS ItemName
FROM         Db_Tank.dbo.Active_Award


GO
