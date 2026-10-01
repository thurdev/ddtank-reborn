-- SQL_STORED_PROCEDURE dbo.SP_TotemHonorTemplate_All (modified 2022-07-07T21:55:04.900)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_TotemHonorTemplate_All]
--@Grade int
AS  
 select * from [dbo].[Totem_Honor_Template] --where [Grage] = @Grade

GO
