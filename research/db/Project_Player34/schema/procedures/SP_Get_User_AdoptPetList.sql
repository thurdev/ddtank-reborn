-- SQL_STORED_PROCEDURE dbo.SP_Get_User_AdoptPetList (modified 2021-06-04T05:18:35.383)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_User_AdoptPetList]
@UserID int
AS  
 select * from [dbo].[AdoptPetList] where UserID = @UserID and IsExit = 1


GO
