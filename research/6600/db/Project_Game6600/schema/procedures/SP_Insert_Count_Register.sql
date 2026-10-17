-- SQL_STORED_PROCEDURE dbo.SP_Insert_Count_Register (modified 2015-01-25T14:04:48.137)
-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户注册统计信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Count_Register]
	@ApplicationId		int,
	@SubId				int,
	@RegDate			datetime,
	@UserId				int,
	@Sex				bit,
	@Ip					bigint
AS
BEGIN
	insert into Db_Count..Count_Register(ApplicationId,SubId,RegDateTime,UserId,Sex,UserIp)
	values(@ApplicationId,@SubId,@RegDate,@UserId,@Sex,@Ip)
END

GO
