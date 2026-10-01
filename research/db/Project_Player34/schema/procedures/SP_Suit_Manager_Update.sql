-- SQL_STORED_PROCEDURE dbo.SP_Suit_Manager_Update (modified 2021-06-04T05:18:35.707)













-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Suit_Manager_Update]
@kill nvarchar(200),
@UserID int
AS  
update Suit_Manager set Kill_List = @kill where UserID = @UserID












GO
