-- SQL_STORED_PROCEDURE dbo.SP_Suit_Manager_GET (modified 2021-06-04T05:18:35.700)













-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Suit_Manager_GET]
@UserID int
AS  
 select * from  [dbo].[Suit_Manager] where UserID = @UserID












GO
