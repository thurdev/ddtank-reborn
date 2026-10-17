-- SQL_STORED_PROCEDURE dbo.SP_Get_SingleFields (modified 2015-01-25T14:04:48.630)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_SingleFields]
@ID int
AS  
 select * from [dbo].[Sys_User_Field] where [FarmID] = @ID and IsExit = 1

GO
