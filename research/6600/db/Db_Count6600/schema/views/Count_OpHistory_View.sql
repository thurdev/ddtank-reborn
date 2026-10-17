-- VIEW dbo.Count_OpHistory_View (modified 2012-04-21T07:53:24.200)
CREATE VIEW [dbo].[Count_OpHistory_View]
AS
SELECT id, ApplicationId, OpDateTime, OpData, ModuleName, OpActive, OpUser, 
      IPAddress
FROM dbo.Count_OpHistory



GO
