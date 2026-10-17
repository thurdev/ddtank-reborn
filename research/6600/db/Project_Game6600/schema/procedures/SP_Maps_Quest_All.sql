-- SQL_STORED_PROCEDURE dbo.SP_Maps_Quest_All (modified 2015-01-25T14:04:48.140)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<战斗信息：任务物品掉落配置>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Maps_Quest_All]
AS  
 select * from Map_Quest_Goods

GO
