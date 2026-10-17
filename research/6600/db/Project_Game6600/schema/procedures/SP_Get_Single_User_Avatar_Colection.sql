-- SQL_STORED_PROCEDURE dbo.SP_Get_Single_User_Avatar_Colection (modified 2015-01-25T14:04:48.633)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_Single_User_Avatar_Colection]
		@UserID int
AS  
 select *  from  dbo.User_Avatar_Colection where [UserID] = @UserID

GO
