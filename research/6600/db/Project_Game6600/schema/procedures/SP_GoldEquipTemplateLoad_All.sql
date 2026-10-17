-- SQL_STORED_PROCEDURE dbo.SP_GoldEquipTemplateLoad_All (modified 2015-01-25T14:04:48.610)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GoldEquipTemplateLoad_All]
--@Grade int
AS  
 select * from [dbo].[GoldEquipTemplateLoad] --where [Grage] = @Grade

GO
