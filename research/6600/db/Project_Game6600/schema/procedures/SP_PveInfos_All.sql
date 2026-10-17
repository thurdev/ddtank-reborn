-- SQL_STORED_PROCEDURE dbo.SP_PveInfos_All (modified 2015-01-25T14:04:48.650)
-- =============================================
-- Author:		<Peter>
-- ALTER  date: <2009-11-23>
-- Description:	<地图信息：读取全部Npc>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_PveInfos_All]
AS  
 select *  from Pve_Info ORDER BY Type, Ordering

GO
