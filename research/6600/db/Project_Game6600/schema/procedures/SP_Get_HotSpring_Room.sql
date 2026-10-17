-- SQL_STORED_PROCEDURE dbo.SP_Get_HotSpring_Room (modified 2015-01-25T14:04:48.640)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_HotSpring_Room]
	-- Add the parameters for the stored procedure here
AS
BEGIN
	SELECT * from [HotSpringRoom]
END

GO
