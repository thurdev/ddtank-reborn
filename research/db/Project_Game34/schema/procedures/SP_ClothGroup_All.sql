-- SQL_STORED_PROCEDURE dbo.SP_ClothGroup_All (modified 2022-03-05T10:01:55.740)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ClothGroup_All]
--@Grade int
AS  
 select * from [dbo].ClothGroupTemplateInfo

GO
