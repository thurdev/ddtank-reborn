-- VIEW dbo.ddt_ServerList_View (modified 2012-04-21T07:53:24.780)
CREATE VIEW [dbo].[ddt_ServerList_View]
AS
SELECT a.ID, a.Name, a.IP, a.Port, a.State, a.Online, a.Total, a.Room, a.MustLevel, 
      a.LowestLevel, b.OpenMap
FROM Db_Tank.dbo.Server_List a LEFT OUTER JOIN
      Db_Tank.dbo.Map_Server b ON b.ServerID = a.ID


GO
