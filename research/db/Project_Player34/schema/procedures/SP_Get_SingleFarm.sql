-- SQL_STORED_PROCEDURE dbo.SP_Get_SingleFarm (modified 2021-06-04T05:18:35.370)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_SingleFarm]
@ID int
AS  
 select * from [dbo].[Sys_User_Farm] where [FarmID] = @ID --and IsExit = 1


GO
