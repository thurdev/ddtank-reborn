-- SQL_STORED_PROCEDURE dbo.SP_Suit_Manager_ADD (modified 2021-06-04T05:18:35.700)













-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Suit_Manager_ADD]
@UserID int
AS  
 insert into Suit_Manager (UserID, Kill_List) values (@UserID, N'0,')










GO
