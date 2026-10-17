-- SQL_STORED_PROCEDURE dbo.SP_ASSInfo_Single (modified 2015-01-25T14:04:48.457)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷：查询一条用户身份信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_ASSInfo_Single]
@UserID int
 AS
select * from AASInfo where  UserID = @UserID

GO
