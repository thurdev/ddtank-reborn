-- SQL_STORED_PROCEDURE dbo.SP_Suit_Manager_Reset (modified 2021-06-04T05:18:35.703)













-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Suit_Manager_Reset]
@UserID int
AS  
 update Suit_Manager set Kill_list = N'0,' where UserID = @UserID












GO
