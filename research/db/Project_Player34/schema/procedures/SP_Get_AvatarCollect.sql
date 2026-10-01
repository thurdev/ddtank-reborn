-- SQL_STORED_PROCEDURE dbo.SP_Get_AvatarCollect (modified 2022-03-05T10:01:52.047)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_AvatarCollect]
@UserID int
AS  
 select * from [dbo].Sys_Users_AvatarCollection WHERE UserID = @UserID AND IsExit = 'True'

GO
