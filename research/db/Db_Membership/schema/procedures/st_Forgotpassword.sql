-- SQL_STORED_PROCEDURE dbo.st_Forgotpassword (modified 2012-04-21T07:55:42.357)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_Forgotpassword]
@email nvarchar(200),
@UserName nvarchar(32),
@new_password nvarchar(200)
AS
BEGIN
	Declare @ch_Email nvarchar(200)
	set @ch_Email = (select [Email] from Users where [Username]=@UserName)
	
	If (@ch_Email = @email)
		Begin
			update Users set [Password]=@new_password where [Username]=@UserName;
			Return @@Rowcount;
		End
	Else
		Return -1;

END
GO
