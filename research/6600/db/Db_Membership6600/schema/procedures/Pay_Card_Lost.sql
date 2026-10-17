-- SQL_STORED_PROCEDURE dbo.Pay_Card_Lost (modified 2012-04-21T07:54:31.077)








CREATE             PROCEDURE Pay_Card_Lost
 @OrderId varchar(20),
 @CardId varchar(20),
 @CardPassword varchar(20),
 @ApplicationId varchar(20),
 @ouototal varchar(50)='' output 

AS
/*
 用户用卡密的方式进行充值，返回1代表该卡密有效，0表示卡密无效
 @OrderId       订单号
 @CardId        卡号
 @CardPassword  密码
 @ApplicationId 编号
 @ouototal      返回 
*/

  Select   @ouototal=Count(*) from Pay_Card 
          Where ApplicationId=@ApplicationId 
                And CardId=@CardId  
                And CardPassword=@CardPassword   
                And BeginDay<=Getdate() 
                And Getdate()<=EndDay 
                And IsValues=1 
                And IsOpen=1
  IF (@ouototal=1)
    Begin
      Update  Pay_Card Set IsValues=0,OrderId=@OrderId 
              Where  ApplicationId=@ApplicationId 
                     And CardId=@CardId  
                     And CardPassword=@CardPassword 
    End


  


GO
