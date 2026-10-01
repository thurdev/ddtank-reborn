-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Users_All (modified 2021-06-04T05:18:35.020)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE Procedure [dbo].[SP_Consortia_Users_All]
@ConsortiaID int
AS  
 select * from V_Consortia_Users where [IsExist]=1 and ConsortiaID = @ConsortiaID











GO
