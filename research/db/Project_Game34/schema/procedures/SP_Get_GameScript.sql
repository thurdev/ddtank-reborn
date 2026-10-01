-- SQL_STORED_PROCEDURE dbo.SP_Get_GameScript (modified 2021-06-04T01:29:18.040)




-- =============================================
-- Author:		<Peter>
-- ALTER  date: <2009-11-23>
-- Description:	<炼化表:根据地图Id,难度等级获取GameScript>
-- =============================================
CREATE Procedure [dbo].[SP_Get_GameScript]
  @Id int,
  @ScriptType nvarchar(20)
as
exec ('select ' + @ScriptType + ' from Pve_Info where ID = '+ @Id)









GO
