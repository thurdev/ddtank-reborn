-- SQL_STORED_PROCEDURE dbo.SP_UpdateShop (modified 2022-08-29T20:38:50.957)
CREATE PROCEDURE [dbo].[SP_UpdateShop]
	@ID INT,
	@LimitCount INT
AS
BEGIN
	UPDATE Shop SET LimitCount = @LimitCount WHERE ID = @ID
END

GO
