-- SQL_STORED_PROCEDURE dbo.SP_Update_HotSpring (modified 2015-01-25T14:04:48.233)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_HotSpring]
	-- Add the parameters for the stored procedure here
	@RoomID int,
	@CurCount int
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
UPDATE [HotSpringRoom] SET [curCount] = [curCount]+@CurCount WHERE [roomID] =@RoomID

END

GO
