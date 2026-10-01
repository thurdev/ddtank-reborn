-- SQL_STORED_PROCEDURE dbo.st_Changepassword (modified 2012-04-21T07:55:44.827)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_Changepassword]
@id int,
@password nvarchar(200),
@new_password nvarchar(200)
AS
BEGIN

	Declare @pass nvarchar(200)
	set @pass = (select [Password] from Users where [ID]=@id)
	
	If (@pass = @password)
		Begin
			update Users set [Password]=@new_password where [ID]=@id;
			Return @@Rowcount;
		End
	Else
		Return -1;

END
GO
