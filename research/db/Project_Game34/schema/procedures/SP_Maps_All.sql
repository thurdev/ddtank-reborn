-- SQL_STORED_PROCEDURE dbo.SP_Maps_All (modified 2021-06-04T01:29:18.360)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<地图信息：读取全部地图>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Maps_All]
AS  
 select *  from Game_Map order by ID desc








GO
