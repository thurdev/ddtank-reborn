-- SQL_STORED_PROCEDURE dbo.SP_Users_Quest_Delete (modified 2021-08-19T07:32:49.617)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [SP_Users_Quest_Delete]
	-- Add the parameters for the stored procedure here
	@UserID int, 
	@QuestID int
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	delete from dbo.QuestData where UserID = @UserID and QuestID = @QuestID
END

GO
