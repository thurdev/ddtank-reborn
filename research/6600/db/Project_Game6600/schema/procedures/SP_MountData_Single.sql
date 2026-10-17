-- SQL_STORED_PROCEDURE dbo.SP_MountData_Single (modified 2015-01-25T14:04:48.667)
-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2010-1-8>
-- Description:	根据Key获取服务器配置
-- =============================================
CREATE Procedure [dbo].[SP_MountData_Single]
	@UserID int
AS
BEGIN
	select * from [dbo].[Mount_Data] where UserID = @UserID
END

GO
