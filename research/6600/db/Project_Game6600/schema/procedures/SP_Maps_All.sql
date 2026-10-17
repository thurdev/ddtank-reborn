-- SQL_STORED_PROCEDURE dbo.SP_Maps_All (modified 2015-01-25T14:04:48.713)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<地图信息：读取全部地图>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Maps_All]
AS  
 select *  from Game_Map order by ID desc

GO
