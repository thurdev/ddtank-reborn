-- SQL_STORED_PROCEDURE dbo.SP_Users_Gift_Single (modified 2021-06-04T05:18:36.133)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷：查询一条用户身份信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Users_Gift_Single]
@UserID int,
@IsReceive bit
 AS
 IF @IsReceive = 'True'
 begin
	select * from Sys_Users_Gift where ReceiverID = @UserID order by ID desc
 end
 else
 begin
	select * from Sys_Users_Gift where SenderID = @UserID  order by ID desc
 end


GO
