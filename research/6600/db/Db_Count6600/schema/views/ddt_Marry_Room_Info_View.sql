-- VIEW dbo.ddt_Marry_Room_Info_View (modified 2012-04-21T07:53:24.780)
--Author：keny         Date：2009-12-01       Description：举办婚礼信息查询
CREATE VIEW [dbo].[ddt_Marry_Room_Info_View]
AS
SELECT TOP 100 PERCENT ID, PlayerID, PlayerName, GroomID, GroomName, BrideID, 
      BrideName, AvailTime, BeginTime, BreakTime, IsHymeneal, isExist AS IsExist, 
      IsGunsaluteUsed
FROM Db_Tank_Copy.dbo.Marry_Room_Info Marry_Room_Info_1
ORDER BY ID DESC




GO
